'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string | null;
  className?: string;
}

export function ConnectionStatus({ isConnected, error, className }: ConnectionStatusProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      )} />
      <span className={cn(
        'text-xs font-medium',
        isConnected ? 'text-green-400' : 'text-red-400'
      )}>
        {isConnected ? 'Connected to VS Code' : error || 'Disconnected'}
      </span>
    </div>
  );
}
