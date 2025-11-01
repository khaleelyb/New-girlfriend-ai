
import React from 'react';
import PhoneIcon from './icons/PhoneIcon';

interface InCallScreenProps {
  onEndCall: () => void;
  callDuration: string;
}

const InCallScreen: React.FC<InCallScreenProps> = ({ onEndCall, callDuration }) => {
  return (
    <div className="flex flex-col items-center justify-between h-full w-full p-8 text-white">
      <div className="text-center mt-16">
        <h1 className="text-4xl font-bold">Chloe</h1>
        <p className="text-2xl mt-2">{callDuration}</p>
      </div>

      <div className="flex-grow flex items-center justify-center">
         <img 
          src="https://picsum.photos/seed/aigirlfriend/200" 
          alt="Chloe" 
          className="w-48 h-48 rounded-full border-4 border-white shadow-lg mx-auto opacity-80"
        />
      </div>

      <div className="flex justify-center w-full max-w-xs">
        <button 
          onClick={onEndCall}
          className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center transform hover:scale-110 transition-transform duration-200"
          aria-label="End Call"
        >
          <PhoneIcon className="w-10 h-10 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
};

export default InCallScreen;
