"use client"

import React, { useState, useMemo } from 'react'
import { useChatHistoryStore, ChatSession } from '@/lib/useChatHistoryStore'
import SessionListItem from './SessionListItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Volume2
} from 'lucide-react'
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
} from '@/components/ui/alert-dialog'

interface ChatHistoryPanelProps {
  currentTab: 'general' | 'mix' | 'theory' | 'instrument'
  lessonMode: boolean
  onSessionSelect: (session: ChatSession) => void
  onNewSession: (tabType: ChatSession['tabType']) => void
  className?: string
}

const tabIcons = {
  general: <MessageCircle className="w-4 h-4" />,
  mix: <Volume2 className="w-4 h-4" />,
  theory: <Music className="w-4 h-4" />,
  instrument: <Guitar className="w-4 h-4" />
}

const tabLabels = {
  general: 'General',
  mix: 'Mix',
  theory: 'Theory',
  instrument: 'Instrument'
}

export default function ChatHistoryPanel({
  currentTab,
  lessonMode,
  onSessionSelect,
  onNewSession,
  className = ''
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
    importSessions
  } = useChatHistoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ChatSession['tabType']>(currentTab)

  // Get sessions for active tab
  const displaySessions = useMemo(() => {
    if (searchQuery.trim()) {
      return searchSessions(searchQuery).filter(session => session.tabType === activeTab)
    }
    return getSessionsByTab(activeTab)
  }, [searchQuery, activeTab, sessions, getSessionsByTab, searchSessions])

  const handleExport = () => {
    const data = exportSessions()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studio-brain-sessions-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        if (importSessions(content)) {
          // Success feedback could be added here
          console.log('Sessions imported successfully')
        } else {
          console.error('Failed to import sessions')
        }
      }
      reader.readAsText(file)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      onSessionSelect(session)
    }
  }

  const handleDuplicate = (sessionId: string) => {
    const newSessionId = duplicateSession(sessionId)
    if (newSessionId) {
      const newSession = sessions.find(s => s.id === newSessionId)
      if (newSession) {
        onSessionSelect(newSession)
      }
    }
  }

  const totalSessions = sessions.length
  const tabCounts = {
    general: sessions.filter(s => s.tabType === 'general').length,
    mix: sessions.filter(s => s.tabType === 'mix').length,
    theory: sessions.filter(s => s.tabType === 'theory').length,
    instrument: sessions.filter(s => s.tabType === 'instrument').length
  }

  return (
    <div className={`flex flex-col h-full bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-200">Chat History</h2>
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
              {totalSessions}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="p-2 hover:bg-slate-700"
              title="Export sessions"
            >
              <Download className="w-4 h-4" />
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
              onClick={() => document.getElementById('import-sessions')?.click()}
              className="p-2 hover:bg-slate-700"
              title="Import sessions"
            >
              <Upload className="w-4 h-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-slate-700 text-red-400 hover:text-red-400"
                  title="Clear all sessions"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Sessions</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all chat sessions. This action cannot be undone.
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ChatSession['tabType'])} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-4 mt-4 bg-slate-800">
          {Object.entries(tabLabels).map(([key, label]) => (
            <TabsTrigger
              key={key}
              value={key}
              className={`flex items-center gap-1 text-xs ${
                lessonMode
                  ? 'data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan'
                  : 'data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple'
              }`}
            >
              {tabIcons[key as keyof typeof tabIcons]}
              <span className="hidden sm:inline">{label}</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {tabCounts[key as keyof typeof tabCounts]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Session Lists */}
        <div className="flex-1 overflow-hidden">
          {Object.keys(tabLabels).map((tabKey) => (
            <TabsContent key={tabKey} value={tabKey} className="h-full mt-4">
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">
                    {displaySessions.length} session{displaySessions.length !== 1 ? 's' : ''}
                  </span>
                  <Button
                    onClick={() => onNewSession(tabKey as ChatSession['tabType'])}
                    size="sm"
                    className={`${
                      lessonMode
                        ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30'
                        : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30'
                    }`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {displaySessions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {searchQuery ? 'No sessions found' : `No ${tabLabels[tabKey as keyof typeof tabLabels].toLowerCase()} sessions yet`}
                      </p>
                      {!searchQuery && (
                        <p className="text-xs mt-1">Start a conversation to create your first session</p>
                      )}
                    </div>
                  ) : (
                    displaySessions.map((session) => (
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
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}