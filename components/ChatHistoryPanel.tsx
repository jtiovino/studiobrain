'use client';

import React, { useState, useMemo } from 'react';
import { useChatHistoryStore, ChatSession } from '@/lib/useChatHistoryStore';
import SessionListItem from './SessionListItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  History,
  Trash2,
  Download,
  Upload,
  MessageCircle,
  Music,
  Guitar,
  Volume2,
  BookOpen,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ChatHistoryPanelProps {
  currentTab: ChatSession['tabType'];
  lessonMode: boolean;
  onSessionSelect: (session: ChatSession) => void;
  onNewSession: (tabType: ChatSession['tabType']) => void;
  className?: string;
}

const tabIcons = {
  general: <MessageCircle className="w-4 h-4" />,
  mix: <Volume2 className="w-4 h-4" />,
  theory: <Music className="w-4 h-4" />,
  instrument: <Guitar className="w-4 h-4" />,
  practice: <BookOpen className="w-4 h-4" />,
};

const tabLabels = {
  general: 'General',
  mix: 'Mix',
  theory: 'Theory',
  instrument: 'Instrument',
  practice: 'Practice',
};

export default function ChatHistoryPanel({
  currentTab,
  lessonMode,
  onSessionSelect,
  onNewSession,
  className = '',
}: ChatHistoryPanelProps) {
  const {
    sessions,
    currentSessionId,
    deleteSession,
    renameSession,
    duplicateSession,
    clearAllSessions,
    getSessionsByTab,
    searchSessions,
    exportSessions,
    importSessions,
  } = useChatHistoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] =
    useState<ChatSession['tabType']>(currentTab);

  // Get sessions for active tab
  const displaySessions = useMemo(() => {
    if (searchQuery.trim()) {
      return searchSessions(searchQuery).filter(
        session => session.tabType === activeTab
      );
    }
    return getSessionsByTab(activeTab);
  }, [searchQuery, activeTab, sessions, getSessionsByTab, searchSessions]);

  const handleExport = () => {
    const data = exportSessions();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-brain-sessions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        if (importSessions(content)) {
          // Success feedback could be added here
          console.log('Sessions imported successfully');
        } else {
          console.error('Failed to import sessions');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      onSessionSelect(session);
    }
  };

  const handleDuplicate = (sessionId: string) => {
    const newSessionId = duplicateSession(sessionId);
    if (newSessionId) {
      const newSession = sessions.find(s => s.id === newSessionId);
      if (newSession) {
        onSessionSelect(newSession);
      }
    }
  };

  const totalSessions = sessions.length;
  const tabCounts = {
    general: sessions.filter(s => s.tabType === 'general').length,
    mix: sessions.filter(s => s.tabType === 'mix').length,
    theory: sessions.filter(s => s.tabType === 'theory').length,
    instrument: sessions.filter(s => s.tabType === 'instrument').length,
  };

  return (
    <div
      className={`w-64 h-screen overflow-y-auto bg-zinc-900 flex flex-col !bg-gradient-to-b !from-slate-900/98 !to-slate-800/95 backdrop-blur-sm !border-r-2 !border-slate-600/60 !shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-700/80">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-200 text-base">
              Chat History
            </h2>
            <Badge
              variant="outline"
              className="text-xs text-slate-400 border-slate-600/70 bg-slate-800/30 px-2 py-0.5"
            >
              {totalSessions}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
              title="Export sessions"
            >
              <Download className="w-4 h-4 text-slate-400" />
            </Button>

            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-sessions"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                document.getElementById('import-sessions')?.click()
              }
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
              title="Import sessions"
            >
              <Upload className="w-4 h-4 text-slate-400" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-all duration-200"
                  title="Clear all sessions"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Sessions</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all chat sessions. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllSessions}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 !text-slate-300" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="!pl-10 !bg-slate-700/60 !border-2 !border-slate-600/70 !shadow-inner !text-slate-100 !placeholder:text-slate-400 focus:!border-slate-500 focus:!shadow-inner focus:!shadow-slate-900/30 !transition-all !duration-200 !rounded-lg"
          />
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(tabLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as ChatSession['tabType'])}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === key
                    ? lessonMode
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-purple-700 text-white shadow-sm'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-slate-200'
                }`}
              >
                {tabIcons[key as keyof typeof tabIcons]}
                <span>{label}</span>
                <Badge
                  variant="secondary"
                  className={`text-xs px-1.5 py-0.5 ${
                    activeTab === key
                      ? lessonMode
                        ? 'bg-cyan-500/30 text-cyan-100 border-cyan-400/30'
                        : 'bg-purple-600/30 text-purple-100 border-purple-400/30'
                      : 'bg-slate-600/50 text-slate-300 border-slate-500/50'
                  }`}
                >
                  {tabCounts[key as keyof typeof tabCounts]}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Session Lists */}
      <div className="flex-1 overflow-hidden">
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700/30 font-medium">
                {displaySessions.length} session
                {displaySessions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <Button
              onClick={() => onNewSession(activeTab)}
              size="sm"
              className={`!rounded-full !px-4 !py-2 !text-xs !font-medium transition-all duration-200 !shadow-sm !h-auto ${
                lessonMode
                  ? '!bg-neon-cyan/20 !text-neon-cyan hover:!bg-neon-cyan/30 !border !border-neon-cyan/30 hover:!shadow-neon-cyan/10'
                  : '!bg-neon-purple/20 !text-neon-purple hover:!bg-neon-purple/30 !border !border-neon-purple/30 hover:!shadow-neon-purple/10'
              }`}
            >
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
            {displaySessions.length === 0 ? (
              <div className="!bg-gradient-to-br !from-slate-800/60 !to-slate-700/40 !border-2 !border-slate-600/60 !rounded-xl !p-8 mt-4 !shadow-xl">
                <div className="text-center py-8 text-slate-400">
                  <div className="!bg-slate-700/30 !rounded-full !p-4 !w-16 !h-16 mx-auto mb-4 flex items-center justify-center">
                    <MessageCircle className="!w-8 !h-8 !text-slate-300" />
                  </div>
                  <p className="!text-base !font-semibold mb-2 !text-slate-200">
                    {searchQuery
                      ? 'No sessions found'
                      : `No ${tabLabels[activeTab].toLowerCase()} sessions`}
                  </p>
                  {!searchQuery && (
                    <p className="!text-sm !text-slate-400 !leading-relaxed">
                      Start a conversation to create your first session
                    </p>
                  )}
                </div>
              </div>
            ) : (
              displaySessions.map(session => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={handleSessionSelect}
                  onDelete={deleteSession}
                  onRename={renameSession}
                  onDuplicate={handleDuplicate}
                  lessonMode={lessonMode}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
