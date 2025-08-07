'use client';

import { format } from 'date-fns';
import {
  MoreHorizontal,
  Trash2,
  Edit2,
  Copy,
  MessageCircle,
  Music,
  Guitar,
  Volume2,
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ChatSession } from '@/lib/useChatHistoryStore';

interface SessionListItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onRename: (sessionId: string, newTitle: string) => void;
  onDuplicate: (sessionId: string) => void;
  lessonMode: boolean;
}

const getTabIcon = (tabType: ChatSession['tabType']) => {
  switch (tabType) {
    case 'general':
      return <MessageCircle className="w-4 h-4" />;
    case 'mix':
      return <Volume2 className="w-4 h-4" />;
    case 'theory':
      return <Music className="w-4 h-4" />;
    case 'instrument':
      return <Guitar className="w-4 h-4" />;
    default:
      return <MessageCircle className="w-4 h-4" />;
  }
};

const getTabColor = (tabType: ChatSession['tabType'], lessonMode: boolean) => {
  return {
    general: lessonMode
      ? 'text-neon-cyan bg-neon-cyan/10'
      : 'text-neon-purple bg-neon-purple/10',
    mix: 'text-neon-blue bg-neon-blue/10',
    theory: lessonMode
      ? 'text-neon-cyan bg-neon-cyan/10'
      : 'text-neon-purple bg-neon-purple/10',
    instrument: lessonMode
      ? 'text-neon-cyan bg-neon-cyan/10'
      : 'text-neon-purple bg-neon-purple/10',
    practice: lessonMode
      ? 'text-neon-cyan bg-neon-cyan/10'
      : 'text-neon-purple bg-neon-purple/10',
  }[tabType];
};

export default function SessionListItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onDuplicate,
  lessonMode,
}: SessionListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== session.title) {
      onRename(session.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(session.title);
      setIsEditing(false);
    }
  };

  const messageCount = session.messages.length;
  const lastMessageTime = format(session.lastModified, 'MMM d, h:mm a');

  return (
    <div
      className={`group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
        isActive
          ? lessonMode
            ? 'bg-neon-cyan/10 border-neon-cyan/40 shadow-lg shadow-neon-cyan/20'
            : 'bg-neon-purple/10 border-neon-purple/40 shadow-lg shadow-neon-purple/20'
          : 'bg-glass-bg backdrop-blur-sm border-glass-border hover:border-slate-400'
      }`}
      onClick={() => !isEditing && onSelect(session.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Badge
            variant="outline"
            className={`flex-shrink-0 px-2 py-1 text-xs ${getTabColor(session.tabType, lessonMode)}`}
          >
            {getTabIcon(session.tabType)}
          </Badge>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="h-6 text-sm p-1 bg-slate-800 border-slate-600"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <h4
                className={`font-semibold text-sm line-clamp-2 ${
                  isActive
                    ? lessonMode
                      ? 'text-neon-cyan'
                      : 'text-neon-purple'
                    : 'text-slate-200'
                }`}
              >
                {session.title}
              </h4>
            )}

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">
                {messageCount} message{messageCount !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">{lastMessageTime}</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 p-1 h-6 w-6 hover:bg-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation();
                onDuplicate(session.id);
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation();
                onDelete(session.id);
              }}
              className="text-red-400 focus:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
