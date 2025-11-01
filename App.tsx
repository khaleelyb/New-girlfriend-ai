import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { CallState } from './types';
import IncomingCallScreen from './components/IncomingCallScreen';
import InCallScreen from './components/InCallScreen';
import CallEndedScreen from './components/CallEndedScreen';
import { useCallTimer } from './hooks/useCallTimer';
import { createBlob, decode, decodeAudioData } from './utils/audioUtils';

// Polyfill for webkitAudioContext
window.AudioContext = window.AudioContext || (window as any).webkitAudioContext;

const App: React.FC = () => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [error, setError] = useState<string | null>(null);

  const { time: callDuration, resetTimer } = useCallTimer(callState === 'connected');
  const [finalDuration, setFinalDuration] = useState('00:00');

  const aiRef = useRef<GoogleGenAI | null>(null);
  // FIX: The `LiveSession` type is not exported from the '@google/genai' package.
  // Replaced `LiveSession` with `any` to resolve the compilation error.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    console.log("Cleaning up resources...");
    
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            console.log("Closing session");
            session.close();
        }).catch(e => console.error("Error closing session:", e));
        sessionPromiseRef.current = null;
    }
    
    outputSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        console.warn("Could not stop audio source", e);
      }
    });
    outputSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
    }
    if (micSourceRef.current) {
        micSourceRef.current.disconnect();
        micSourceRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close().catch(console.error);
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close().catch(console.error);
        outputAudioContextRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

  }, []);

  const handleEndCall = useCallback(() => {
    setFinalDuration(callDuration);
    setCallState('ended');
  }, [callDuration]);

  const handleAcceptCall = useCallback(async () => {
    setError(null);
    setCallState('connected');

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
      
      const inputAudioContext = inputAudioContextRef.current;
      const outputAudioContext = outputAudioContextRef.current;
      
      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: "You are Chloe, my friendly and caring girlfriend. Keep your responses short and conversational, like we're on a real phone call.",
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onopen: () => {
            console.log('Session opened.');
            if (!streamRef.current || !inputAudioContext) return;
            
            micSourceRef.current = inputAudioContext.createMediaStreamSource(streamRef.current);
            scriptProcessorRef.current = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            micSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              if (!outputAudioContext) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContext,
                24000,
                1
              );
              
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              
              source.addEventListener('ended', () => {
                 outputSourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              outputSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
                outputSourcesRef.current.forEach(source => source.stop());
                outputSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError('An error occurred during the call.');
            handleEndCall();
          },
          onclose: () => {
            console.log('Session closed.');
          },
        },
      });

    } catch (e: any) {
      console.error("Failed to start call:", e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError("Microphone permission denied. Please allow microphone access.");
      } else if (e.message?.includes('API key not valid')) {
          setError("Invalid API Key. Please check your configuration.");
      }
      else {
        setError(`Call failed: ${e.message}`);
      }
      setCallState('ended');
    }
  }, [handleEndCall]);

  const handleCallAgain = () => {
    resetTimer();
    setFinalDuration('00:00');
    setError(null);
    setCallState('ringing');
  };

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    if (callState === 'ringing') {
        audio = new Audio('https://cdn.pixabay.com/audio/2022/08/22/audio_1011559837.mp3');
        audio.loop = true;
        audio.play().catch(e => console.error("Ringtone playback failed:", e));
    }
    return () => {
        if (audio) {
          audio.pause();
        }
    };
  }, [callState]);

  useEffect(() => {
    if (callState === 'idle') {
      const timer = setTimeout(() => {
        setCallState('ringing');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [callState]);
  
  useEffect(() => {
    if (callState === 'ended') {
      cleanup();
    }
    return cleanup;
  }, [callState, cleanup]);
  
  const renderContent = () => {
    switch (callState) {
      case 'ringing':
        return <IncomingCallScreen onAccept={handleAcceptCall} onDecline={handleEndCall} />;
      case 'connected':
        return <InCallScreen onEndCall={handleEndCall} callDuration={callDuration} />;
      case 'ended':
        return <CallEndedScreen onCallAgain={handleCallAgain} finalDuration={error ? 'Error' : finalDuration} />;
      case 'idle':
      default:
        return (
          <div className="flex items-center justify-center h-full text-white">
            <p className="text-xl animate-pulse">Connecting...</p>
          </div>
        );
    }
  };

  return (
    <main className="h-screen w-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 font-sans overflow-hidden">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-xl"></div>
        <div className="relative h-full w-full">
            {renderContent()}
            {error && <div className="absolute bottom-4 left-4 right-4 bg-red-500/80 text-white p-3 rounded-lg text-center">{error}</div>}
        </div>
    </main>
  );
};

export default App;
