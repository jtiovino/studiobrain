'use client';

import { Info } from 'lucide-react';
import React from 'react';

interface DisclaimerButtonProps {
  onDisclaimerClick: () => void;
}

export default function DisclaimerButton({
  onDisclaimerClick,
}: DisclaimerButtonProps) {
  const handleClick = () => {
    onDisclaimerClick();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-neutral-800/50 backdrop-blur-sm"
      aria-label="View legal disclaimer"
    >
      <Info className="w-6 h-6 text-white hover:text-indigo-400" />
    </button>
  );
}
