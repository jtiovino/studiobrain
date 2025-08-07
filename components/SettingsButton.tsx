'use client';

import React from 'react';
import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  onSettingsClick: () => void;
}

export default function SettingsButton({
  onSettingsClick,
}: SettingsButtonProps) {
  const handleClick = () => {
    onSettingsClick();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-neutral-800/50 backdrop-blur-sm"
    >
      <Settings className="w-6 h-6 text-white hover:text-indigo-400" />
    </button>
  );
}
