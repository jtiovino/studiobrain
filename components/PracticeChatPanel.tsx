'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { OpenAIService } from '@/lib/openai-service';
import { PracticeSessionState, Step } from '@/lib/practice-plan-schema';

// Use the main ChatMessage interface from the app
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  plugins?: Array<{
    name: string;
    type: string;
    description: string;
    explanation?: string;
  }>;
  practicePlan?: import('../lib/practice-plan-schema').PracticePlan;
}

interface PracticeChatPanelProps {
  practiceSession: PracticeSessionState;
  currentStep: Step;
  lessonMode: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export const PracticeChatPanel: React.FC<PracticeChatPanelProps> = ({
  practiceSession,
  currentStep,
  lessonMode,
  isExpanded,
  onToggle,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useLayoutEffect(() => {
    if (isExpanded && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isExpanded]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await OpenAIService.askPracticeWithContext(
        inputValue.trim(),
        lessonMode,
        practiceSession,
        currentStep,
        messages.map(msg => ({
          role: msg.type as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          plugins: msg.plugins,
        }))
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.response || 'Sorry, I could not generate a response.',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Practice chat error:', error);

      let errorContent =
        'Sorry, there was an error processing your request. Please try again.';

      if (error instanceof Error) {
        if (
          error.message.includes('network') ||
          error.message.includes('fetch')
        ) {
          errorContent =
            'Network error - please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorContent =
            'Request timed out - the server may be busy. Please try again.';
        } else if (error.message.includes('rate limit')) {
          errorContent =
            'Too many requests - please wait a moment before trying again.';
        }
      }

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: errorContent,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    'This is too hard, can you make it easier?',
    "I don't understand this technique",
    'Can you suggest a different approach?',
    "How do I know if I'm doing this right?",
    'I need more time on this step',
  ];

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    textareaRef.current?.focus();
  };

  return (
    <div
      className={`bg-glass-bg/40 backdrop-blur-xl border border-glass-border rounded-lg ${className}`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 flex items-center justify-between transition-colors duration-200 rounded-t-lg ${
          isExpanded ? 'border-b border-glass-border' : ''
        } hover:bg-glass-bg/20`}
      >
        <div className="flex items-center gap-2">
          <MessageCircle
            className={`w-4 h-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
          />
          <span className="font-medium text-slate-200">Practice Assistant</span>
          {messages.length > 0 && (
            <Badge
              variant="secondary"
              className="text-xs bg-slate-700/50 text-slate-300"
            >
              {messages.length}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Chat Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Current Context */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 mb-1">
              Current Context
            </div>
            <div className="text-sm text-slate-300">
              Step {practiceSession.currentStepIndex + 1}:{' '}
              {currentStep?.name || 'Unknown'}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Ask me anything about your current practice step!
                </p>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.type === 'user'
                        ? lessonMode
                          ? 'bg-neon-cyan/20 text-slate-100 border border-neon-cyan/30'
                          : 'bg-neon-purple/20 text-slate-100 border border-neon-purple/30'
                        : 'bg-slate-700/50 text-slate-200 border border-slate-600/50'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700/50 text-slate-200 border border-slate-600/50 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <Lightbulb className="w-3 h-3" />
                Quick questions:
              </div>
              <div className="flex flex-wrap gap-1">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors duration-200 ${
                      lessonMode
                        ? 'border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10'
                        : 'border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10'
                    }`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about this step, request changes, or get help..."
              className="bg-glass-bg border-glass-border text-slate-200 placeholder:text-slate-400 resize-none"
              rows={2}
              disabled={isLoading}
            />

            <div className="flex justify-between items-center">
              <div className="text-xs text-slate-500">
                Press Enter to send, Shift+Enter for new line
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className={`transition-all duration-200 ${
                  lessonMode
                    ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 border border-neon-cyan/30'
                    : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 border border-neon-purple/30'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
