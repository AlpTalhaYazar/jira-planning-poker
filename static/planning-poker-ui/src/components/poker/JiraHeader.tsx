import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '../ui/button';

interface JiraHeaderProps {
  projectName: string;
  projectKey: string;
  onBack?: () => void;
}

export function JiraHeader({ projectName, projectKey, onBack }: JiraHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#0052CC] flex items-center justify-center text-white font-bold text-xs">
              {projectKey.substring(0, 2)}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-tight">{projectName}</h1>
              <p className="text-xs text-slate-500">Planning Poker</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             Connected to Jira Cloud
           </div>
           <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700">
             <Settings className="w-5 h-5" />
           </Button>
        </div>
      </div>
    </header>
  );
}
