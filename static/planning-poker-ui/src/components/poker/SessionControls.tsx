import React from 'react';
import { Button } from '../ui/button';
import { Play, Pause, Check, Settings } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface SessionControlsProps {
  session: {
    id: string;
    status: 'waiting' | 'active' | 'paused' | 'completed' | 'archived';
  };
  isModerator: boolean;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onSettings: () => void;
  loading?: boolean;
}

export function SessionControls({
  session,
  isModerator,
  onPause,
  onResume,
  onComplete,
  onSettings,
  loading = false,
}: SessionControlsProps) {
  if (!isModerator) {
    return null; // Only moderators see controls
  }

  const isActive = session.status === 'active';
  const isPaused = session.status === 'paused';
  const isCompleted = session.status === 'completed';

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
        <Check className="w-4 h-4" />
        Session Completed
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Pause/Resume Toggle */}
        {isActive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                disabled={loading}
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Temporarily pause the session
            </TooltipContent>
          </Tooltip>
        )}

        {isPaused && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                disabled={loading}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Resume
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Resume the paused session
            </TooltipContent>
          </Tooltip>
        )}

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
              disabled={loading}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Session settings
          </TooltipContent>
        </Tooltip>

        {/* Complete Session */}
        {(isActive || isPaused) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={onComplete}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <Check className="w-4 h-4" />
                Complete
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Finish and close this session
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
