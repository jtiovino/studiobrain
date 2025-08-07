'use client';

import { MessageSquare } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PluginSuggestion {
  name: string;
  type: string;
  description: string;
  explanation?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  plugins?: PluginSuggestion[];
}

interface ChatTabPanelProps {
  title: string;
  messages: ChatMessage[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  tabName: 'general' | 'mix' | 'theory' | 'instrument' | 'practice';
  loading: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  showSessionHistory: boolean;
  onToggleHistory: () => void;
}

export function ChatTabPanel({
  title,
  messages,
  scrollRef,
  tabName: _tabName,
  loading,
  inputValue,
  onInputChange,
  onSubmit,
  showSessionHistory,
  onToggleHistory,
}: ChatTabPanelProps) {
  const renderMessageList = () => {
    if (messages.length === 0 && !loading) return null;

    return (
      <div
        ref={scrollRef}
        className="h-80 sm:h-96 max-h-[50vh] sm:max-h-[60vh] overflow-y-scroll mb-6 p-3 sm:p-4 rounded-xl border space-y-3 sm:space-y-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-3 sm:p-4 rounded-xl ${
              msg.type === 'user'
                ? 'bg-blue-600 text-white ml-4 sm:ml-12'
                : 'bg-zinc-800 text-white mr-4 sm:mr-12 border border-zinc-700'
            }`}
          >
            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
              {msg.content}
            </div>
            {msg.plugins && msg.plugins.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-70">
                  Plugin Suggestions:
                </div>
                {msg.plugins.map((plugin, index) => (
                  <div key={index} className="bg-black/20 p-2 rounded border">
                    <div className="text-sm font-medium">
                      {plugin.name} ({plugin.type})
                    </div>
                    <div className="text-xs opacity-80">
                      {plugin.description}
                    </div>
                    {plugin.explanation && (
                      <div className="text-xs mt-1 opacity-70">
                        {plugin.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="bg-zinc-800 text-white mr-8 sm:mr-12 border border-zinc-700 p-3 sm:p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
              <span className="text-sm opacity-70 ml-2">Thinking...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900/95 backdrop-blur-sm border-zinc-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleHistory}
            className="text-xs bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
          >
            {showSessionHistory ? 'Hide' : 'Show'} History
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderMessageList()}
        <div className="space-y-4">
          <textarea
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            placeholder={`Ask about ${title.toLowerCase()}...`}
            className="w-full p-3 sm:p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-400 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors touch-manipulation"
            rows={3}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <Button
            onClick={onSubmit}
            disabled={loading || !inputValue.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Processing...' : `Send to ${title}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
