import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Copy, Play, CheckCircle2, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '../../hooks/useSession';
import * as api from '../../api/forge';
import { BugSmasherGame } from './BugSmasherGame';

interface WaitingRoomProps {
  session: any; // We might just need sessionId if we fetch inside, but App passes session summary.
  onStart: () => void;
}

export function WaitingRoom({ session: initialSession, onStart }: WaitingRoomProps) {
  // We use the hook to get real-time participants
  const { session: sessionData, loading, error } = useSession(initialSession.id);
  const [myAccountId, setMyAccountId] = useState<string | null>(null);

  useEffect(() => {
    api.getUserActiveSession().then((data: any) => {
        if (data?.accountId) {
            setMyAccountId(data.accountId);
        }
    }).catch(console.error);
  }, []);

  const participants = sessionData?.participants || [];
  const session = sessionData?.session || initialSession;
  
  const me = participants.find((p: any) => p.accountId === myAccountId);
  const isReady = me?.isReady;
  const isHost = me?.isModerator;

  const toggleReady = async () => {
    try {
        await api.toggleReady(session.id, !isReady);
    } catch (err) {
        toast.error('Failed to update status');
    }
  };

  // Auto-redirect when session starts
  useEffect(() => {
      if (session?.status === 'active') {
          onStart();
      }
  }, [session?.status, onStart]);

  const handleStartSession = async () => {
      try {
          await api.startSession(session.id);
          onStart(); // Optimistic or wait for event?
      } catch (err) {
          toast.error('Failed to start session');
      }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Session link copied to clipboard');
  };

  const readyCount = participants.filter((p: any) => p.isReady).length;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center mb-10 space-y-4">
        <Badge variant="outline" className="px-3 py-1 text-sm border-amber-200 bg-amber-50 text-amber-700">
          Waiting for players
        </Badge>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{session.name}</h1>
        <div className="flex items-center justify-center gap-4 text-slate-500">
          <p>Session ID: #{session.id}</p>
          <span className="text-slate-300">|</span>
          <button onClick={copyLink} className="flex items-center gap-2 hover:text-[#0052CC] transition-colors">
            <Copy className="w-4 h-4" />
            Copy Invite Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Participants ({participants.length})</CardTitle>
            <div className="text-sm text-slate-500">
              {readyCount}/{participants.length} Ready
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
              {participants.map((p: any) => (
                <div 
                  key={p.accountId} 
                  className={`
                    relative flex flex-col items-center p-6 rounded-xl border transition-all
                    ${p.isReady 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-100'
                    }
                  `}
                >
                  {p.isReady && (
                    <div className="absolute top-2 right-2 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  <Avatar className="w-16 h-16 mb-3 border-2 border-white shadow-sm">
                    <AvatarImage src={p.avatarUrl} />
                    <AvatarFallback className="bg-slate-200 text-slate-500">
                      {(p.displayName || p.name)?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-900">{p.displayName || p.name || 'Unknown'}</span>
                  {p.isModerator && <Badge variant="secondary" className="mt-2 text-xs">Host</Badge>}
                </div>
              ))}
              
              {/* Empty slot placeholder */}
              <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
                <User className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">Waiting...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-medium text-slate-900">Are you ready?</h3>
                <p className="text-sm text-slate-500">Let the host know you're ready to estimate.</p>
              </div>
              <Button 
                size="lg" 
                className={`w-full ${isReady ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-[#0052CC] hover:bg-[#0047B3]'}`}
                onClick={toggleReady}
              >
                {isReady ? 'Not Ready' : 'I\'m Ready'}
              </Button>
            </CardContent>
          </Card>

          <BugSmasherGame />

          {session.status !== 'active' && isHost && (
            <div className="space-y-2">
                <Button 
                  size="lg" 
                  className={`w-full ${readyCount < participants.length ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'}`}
                  onClick={handleStartSession}
                  disabled={readyCount < participants.length}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
                {readyCount < participants.length && (
                    <p className="text-xs text-center text-slate-500">
                        Waiting for all participants to be ready ({readyCount}/{participants.length})
                    </p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
