'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface CopilotConversation {
  id: string;
  title: string;
  timestamp: number;
  messages: CopilotMessage[];
  filePath: string;
}

interface CopilotHistoryConfig {
  version: 'stable' | 'insiders';
  maxConversations: number;
}

interface AvailableCopilotVersions {
  stable: boolean;
  insiders: boolean;
}

interface CopilotHistoryViewerProps {
  sendMessage: (type: string, payload?: any) => void;
  conversations: CopilotConversation[];
  config: CopilotHistoryConfig | null;
  availableVersions: AvailableCopilotVersions | null;
}

export default function CopilotHistoryViewer({
  sendMessage,
  conversations,
  config,
  availableVersions
}: CopilotHistoryViewerProps) {
  const [selectedConversation, setSelectedConversation] = useState<CopilotConversation | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<'stable' | 'insiders'>('stable');

  useEffect(() => {
    // Charger la config et les conversations au montage
    sendMessage('getCopilotHistoryConfig');
    sendMessage('getAvailableCopilotVersions');
    sendMessage('getCopilotHistory');
  }, [sendMessage]);

  useEffect(() => {
    // Mettre à jour la version sélectionnée quand la config arrive
    if (config) {
      setSelectedVersion(config.version);
    }
  }, [config]);

  const handleVersionChange = (version: 'stable' | 'insiders') => {
    setSelectedVersion(version);
    sendMessage('updateCopilotHistoryConfig', { version });
    // Recharger les conversations
    setTimeout(() => {
      sendMessage('getCopilotHistory');
    }, 300);
  };

  const handleRefresh = () => {
    sendMessage('getCopilotHistory');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Historique Copilot</h2>
          <Badge variant="outline">{conversations.length} conversations</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sélecteur de version */}
          {availableVersions && (
            <Select value={selectedVersion} onValueChange={handleVersionChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Version..." />
              </SelectTrigger>
              <SelectContent>
                {availableVersions.stable && (
                  <SelectItem value="stable">VS Code Stable</SelectItem>
                )}
                {availableVersions.insiders && (
                  <SelectItem value="insiders">VS Code Insiders</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
          >
            Actualiser
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 px-4 overflow-hidden">
        {/* Liste des conversations */}
        <div className="w-80 shrink-0">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">
                  Aucune conversation trouvée
                </Card>
              ) : (
                conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                      selectedConversation?.id === conv.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-sm truncate">
                        {conv.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(conv.timestamp)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                        {conv.messages.length} messages
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Détails de la conversation */}
        <Card className="flex-1 overflow-hidden">
          {selectedConversation ? (
            <div className="flex flex-col h-full">
              {/* Header de la conversation */}
              <div className="p-4 border-b">
                <h3 className="font-semibold">{selectedConversation.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatDate(selectedConversation.timestamp)}</span>
                  <span>•</span>
                  <span>{selectedConversation.messages.length} messages</span>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedConversation.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 opacity-70">
                          {msg.role === 'user' ? 'Vous' : 'Copilot'}
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                        {msg.timestamp && (
                          <div className="text-xs opacity-50 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sélectionnez une conversation pour voir les détails
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
