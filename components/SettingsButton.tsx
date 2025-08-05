'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useChatHistoryStore } from '@/lib/useChatHistoryStore';

export default function SettingsButton() {
  const router = useRouter();
  const { currentSessionId, setSettingsSession } = useChatHistoryStore();

  const handleClick = () => {
    // Store current session before navigating to settings
    setSettingsSession(currentSessionId);
    router.push('/settings');
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
