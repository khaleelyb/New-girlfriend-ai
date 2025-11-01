
import React from 'react';
import PhoneIcon from './icons/PhoneIcon';

interface IncomingCallScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({ onAccept, onDecline }) => {
  return (
    <div className="flex flex-col items-center justify-between h-full w-full p-8 text-white">
      <div className="text-center mt-16 animate-pulse">
        <p className="text-xl">Incoming Call...</p>
      </div>

      <div className="text-center">
        <img 
          src="https://picsum.photos/seed/aigirlfriend/200" 
          alt="Chloe" 
          className="w-40 h-40 rounded-full border-4 border-white shadow-lg mx-auto"
        />
        <h1 className="text-4xl font-bold mt-6">Chloe</h1>
        <p className="text-lg mt-1">Mobile</p>
      </div>

      <div className="flex justify-around w-full max-w-xs">
        <div className="text-center">
          <button 
            onClick={onDecline}
            className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center transform hover:scale-110 transition-transform duration-200"
            aria-label="Decline Call"
          >
            <PhoneIcon className="w-10 h-10 rotate-[135deg]" />
          </button>
          <p className="mt-2">Decline</p>
        </div>
        <div className="text-center">
          <button 
            onClick={onAccept}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center transform hover:scale-110 transition-transform duration-200"
            aria-label="Accept Call"
          >
            <PhoneIcon className="w-10 h-10" />
          </button>
          <p className="mt-2">Accept</p>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallScreen;
