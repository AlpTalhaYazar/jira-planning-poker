import React from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Calendar, User, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

interface IssuePanelProps {
  issue: any;
  current: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
}

export function IssuePanel({ issue, current, total, onNext, onPrev }: IssuePanelProps) {
  if (!issue) return <div className="p-8 text-center text-slate-500">No issues selected</div>;

  const assigneeName = issue.assignee || 'Unassigned';
  const assigneeInitial = assigneeName.charAt(0);
  const issueType = issue.type || 'Unknown';
  const description = (issue.description as string | undefined)?.trim();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500">Issue {current} of {total}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} disabled={current === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} disabled={current === total}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {issue.link && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" asChild>
              <a href={issue.link} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-md bg-slate-50 font-mono text-slate-600 border-slate-200">
                  {issue.key}
                </Badge>
                <Badge className={
                  issue.status === 'In Progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 
                  issue.status === 'Done' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 
                  'bg-slate-100 text-slate-700 hover:bg-slate-100'
                }>
                  {issue.status}
                </Badge>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 leading-snug">
              {issue.summary}
            </h2>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" /> Assignee
              </span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                  {assigneeInitial}
                </div>
                <span className="text-sm font-medium text-slate-700">{assigneeName}</span>
              </div>
            </div>
            <div className="space-y-1">
               <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Type
              </span>
              <span className="text-sm font-medium text-slate-700">{issueType}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-900">Description</h3>
            <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
              {description ? (
                <p className="whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="text-slate-400 italic">No description provided.</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
