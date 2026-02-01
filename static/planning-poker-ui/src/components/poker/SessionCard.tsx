import React from 'react';
import { Clock, Users, ArrowRight, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface SessionCardProps {
  session: {
    id: string;
    name: string;
    deck: string;
    created: string;
    status: 'waiting' | 'active' | 'closed' | 'completed';
  };
  onJoin: () => void;
}

export function SessionCard({ session, onJoin }: SessionCardProps) {
  const isClosed = session.status === 'closed' || session.status === 'completed';
  const isActive = session.status === 'active';

  return (
    <Card className="group overflow-hidden border-slate-200 hover:border-[#0052CC]/30 transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge 
            variant="secondary" 
            className={cn(
              "mb-2", 
              isActive && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
              session.status === 'waiting' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
              (session.status === 'closed' || session.status === 'completed') && "bg-slate-100 text-slate-500 hover:bg-slate-100"
            )}
          >
            {session.status === 'waiting' && 'Waiting for players'}
            {session.status === 'active' && 'Voting in progress'}
            {(session.status === 'closed' || session.status === 'completed') && 'Completed'}
          </Badge>
          {isActive && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
        </div>
        <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-[#0052CC] transition-colors">
          {session.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {session.created}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {session.deck} Deck
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-slate-100 bg-slate-50/50">
        <Button 
          onClick={onJoin} 
          disabled={isClosed}
          variant={isActive ? "default" : "outline"}
          className={cn(
            "w-full justify-between group-hover:bg-[#0052CC] group-hover:text-white group-hover:border-[#0052CC]",
            isActive && "bg-[#0052CC] hover:bg-[#0047B3]",
            isClosed && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-500"
          )}
        >
          {isClosed ? 'View Summary' : isActive ? 'Join Active Session' : 'Enter Waiting Room'}
          {isActive ? <PlayCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
