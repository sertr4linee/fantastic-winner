'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div className={cn(
      'flex flex-col h-screen',
      'bg-gradient-to-b from-zinc-950 to-zinc-900',
      className
    )}>
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelHeader({ children, className }: PanelHeaderProps) {
  return (
    <header className={cn(
      'flex items-center justify-between px-6 py-4',
      'border-b border-zinc-800/50',
      'bg-zinc-950/80 backdrop-blur-sm',
      className
    )}>
      {children}
    </header>
  );
}

interface PanelContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelContent({ children, className }: PanelContentProps) {
  return (
    <main className={cn(
      'flex-1 overflow-auto p-6',
      className
    )}>
      {children}
    </main>
  );
}

interface PanelFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelFooter({ children, className }: PanelFooterProps) {
  return (
    <footer className={cn(
      'px-6 py-4',
      'border-t border-zinc-800/50',
      'bg-zinc-950/80 backdrop-blur-sm',
      className
    )}>
      {children}
    </footer>
  );
}
