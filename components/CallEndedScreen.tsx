
import React from 'react';

interface CallEndedScreenProps {
  onCallAgain: () => void;
  finalDuration: string;
}

const CallEndedScreen: React.FC<CallEndedScreenProps> = ({ onCallAgain, finalDuration }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 text-white text-center">
      <h1 className="text-4xl font-bold">Call Ended</h1>
      <p className="text-xl mt-4">Duration: {finalDuration}</p>
      <button
        onClick={onCallAgain}
        className="mt-12 px-8 py-4 bg-blue-500 rounded-full text-lg font-semibold transform hover:scale-105 transition-transform duration-200"
      >
        Call Again
      </button>
    </div>
  );
};

export default CallEndedScreen;
