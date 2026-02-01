import React, { useState, useEffect } from 'react';
import { JQLBar } from './JQLBar';
import { IssuePanel } from './IssuePanel';
import { VotingTable } from './VotingTable';
import { VotingDeck } from './VotingDeck';
import { SessionControls } from './SessionControls';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import { useIsMobile } from '../ui/use-mobile';
import { useSession } from '../../hooks/useSession';
import * as api from '../../api/forge';
import { toast } from 'sonner';
import { SessionSettingsDialog } from './SessionSettingsDialog';

interface ActiveSessionProps {
  sessionId: string;
}

export function ActiveSession({ sessionId }: ActiveSessionProps) {
  const { session: sessionData, loading, error } = useSession(sessionId);
  const isMobile = useIsMobile();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Derived state
  const session = sessionData?.session;
  const participants = sessionData?.participants || [];
  const currentIssue = sessionData?.currentIssue;
  
  const [myAccountId, setMyAccountId] = useState<string | null>(null);

  const [issueDetails, setIssueDetails] = useState<any>(null);
  const [isIssueLoading, setIsIssueLoading] = useState(false);

  useEffect(() => {
    api.getUserActiveSession().then((data: any) => {
        if (data?.accountId) {
            setMyAccountId(data.accountId);
        }
    }).catch(console.error);
  }, []);

  // Fetch issue details when current issue changes
  useEffect(() => {
      if (currentIssue?.issueKey) {
          setIsIssueLoading(true);
          api.getIssue(currentIssue.issueKey)
             .then(setIssueDetails)
             .catch(err => {
                 console.error("Failed to fetch issue details", err);
                 toast.error("Failed to load issue details");
             })
             .finally(() => setIsIssueLoading(false));
      } else {
          setIssueDetails(null);
      }
  }, [currentIssue?.issueKey]);

  const isModerator = participants.find((p: any) => p.accountId === myAccountId)?.isModerator ?? false;

  if (loading && !session) {
    return <div className="flex items-center justify-center h-full">Loading session...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;
  }

  if (!session) {
    return <div className="flex items-center justify-center h-full">Session not found</div>;
  }

  // Handlers
  const handleVote = async (value: string) => {
    if (!currentIssue || currentIssue.isRevealed) return;

    const existingVote = currentIssue.votes[myAccountId || ''];
    if (existingVote?.hasVoted && !session.allowChangeVote) {
      toast.error('Vote changes are disabled for this session');
      return;
    }

    try {
      if (currentIssue.votes[myAccountId || '']?.hasVoted && session.allowChangeVote) {
         await api.updateVote(sessionId, currentIssue.issueKey, value);
      } else {
         await api.castVote(sessionId, currentIssue.issueKey, value);
      }
    } catch (err) {
      toast.error('Failed to cast vote');
      console.error(err);
    }
  };

  const handleReveal = async () => {
    if (!currentIssue) return;
    if (!isModerator) {
      toast.error('Only the host can reveal votes');
      return;
    }
    try {
      setIsActionLoading(true);
      await api.revealIssue(sessionId, currentIssue.issueKey);
    } catch (err) {
      toast.error('Failed to reveal votes');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleNext = async () => {
    const currentIndex = session.issueKeys.indexOf(session.currentIssueKey || '');
    if (currentIndex < session.issueKeys.length - 1) {
        const nextKey = session.issueKeys[currentIndex + 1];
        try {
            setIsActionLoading(true);
            await api.setCurrentIssue(sessionId, nextKey);
        } catch(err) {
            toast.error('Failed to move to next issue');
        } finally {
            setIsActionLoading(false);
        }
    }
  };

  const handlePrev = async () => {
    const currentIndex = session.issueKeys.indexOf(session.currentIssueKey || '');
    if (currentIndex > 0) {
        const prevKey = session.issueKeys[currentIndex - 1];
        try {
            setIsActionLoading(true);
            await api.setCurrentIssue(sessionId, prevKey);
        } catch(err) {
            toast.error('Failed to move to previous issue');
        } finally {
            setIsActionLoading(false);
        }
    }
  };

  const handleSubmitEstimate = async (value: string) => {
      if (!currentIssue) return;
      try {
          setIsActionLoading(true);
          await api.applyEstimate(sessionId, currentIssue.issueKey, value);
          toast.success('Estimate applied!');
      } catch (err) {
          toast.error('Failed to apply estimate');
      } finally {
          setIsActionLoading(false);
      }
  };

  // Session Controls Handlers
  const handlePause = async () => {
      try { await api.pauseSession(sessionId); } catch(e) { toast.error('Failed to pause'); }
  };
  const handleResume = async () => {
      try { await api.resumeSession(sessionId); } catch(e) { toast.error('Failed to resume'); }
  };
  const handleComplete = async () => {
      if (confirm('Are you sure you want to complete this session?')) {
        try { await api.completeSession(sessionId); } catch(e) { toast.error('Failed to complete'); }
      }
  };
  
  const handleSettings = () => {
      setIsSettingsOpen(true);
  };

  const handleSearch = async (jql: string) => {
      if (!session) return;
      try {
          setIsActionLoading(true);
          // First fetch issues to get keys
          const issues = await api.getIssuesForProject(session.projectKey, { jql, maxResults: 50 }) as any[];
          const issueKeys = issues.map((i: any) => i.key);
          
          if (issueKeys.length === 0) {
              toast.error("No issues found with this JQL");
              return;
          }

          await api.updateSessionBacklog(sessionId, issueKeys, jql);
          toast.success(`Backlog updated with ${issueKeys.length} issues`);
      } catch (err) {
          console.error(err);
          toast.error("Failed to update backlog");
      } finally {
          setIsActionLoading(false);
      }
  };

  const displayIssue = issueDetails ? {
      id: issueDetails.key,
      key: issueDetails.key,
      summary: issueDetails.summary,
      status: issueDetails.status,
      type: issueDetails.type || 'Story',
      assignee: issueDetails.assignee || 'Unassigned',
      description: issueDetails.description,
      link: issueDetails.link
  } : {
      id: currentIssue?.issueKey || 'unknown',
      key: currentIssue?.issueKey || 'unknown',
      summary: isIssueLoading ? 'Loading...' : 'No issue selected',
      status: 'Unknown',
      type: 'Story',
      assignee: 'Unassigned',
      description: undefined
  };

  const votesForTable: Record<string, string> = {};
  if (currentIssue?.votes) {
      Object.entries(currentIssue.votes).forEach(([uid, vote]: [string, any]) => {
          if (currentIssue.isRevealed && vote.value) {
              votesForTable[uid] = vote.value;
          } else if (vote.hasVoted) {
              votesForTable[uid] = '?';
          }
      });
  }

  const myVote = currentIssue?.votes[myAccountId || '']?.value;

  const handleRetract = async () => {
    if (!currentIssue || currentIssue.isRevealed) return;
    try {
        await api.retractVote(sessionId, currentIssue.issueKey);
    } catch (err) {
        toast.error('Failed to retract vote');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 p-4 bg-slate-50/50 flex justify-between items-center">
         <JQLBar 
            onSearch={handleSearch} 
            loading={isActionLoading} 
            initialValue={session.jql}
         />
         <SessionControls 
            session={session}
            isModerator={isModerator}
            onPause={handlePause}
            onResume={handleResume}
            onComplete={handleComplete}
            onSettings={handleSettings}
            loading={isActionLoading}
         />
      </div>
      
      <SessionSettingsDialog 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        session={session}
        onUpdate={() => {
            // Refetch session if needed
            // refetch();
        }}
      />
      
      {session.status === 'paused' && (
          <div className="bg-yellow-50 p-2 text-center text-yellow-800 text-sm font-medium border-b border-yellow-100">
              Session is paused
          </div>
      )}

      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <IssuePanel 
             issue={displayIssue} 
             total={session.issueKeys.length} 
             current={session.issueKeys.indexOf(session.currentIssueKey || '') + 1}
             onNext={handleNext}
             onPrev={handlePrev}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={70}>
          <div className="flex flex-col h-full bg-slate-50/30 relative">
             <div className="flex-1 p-8 flex items-center justify-center">
                <VotingTable 
                    votes={votesForTable} 
                    isRevealed={currentIssue?.isRevealed || false} 
                    onReveal={handleReveal}
                    finalEstimate={null}
                    onSubmitEstimate={handleSubmitEstimate}
                    participants={participants.map((p: any) => ({
                        id: p.accountId,
                        accountId: p.accountId,
                        name: p.displayName || p.name || 'Unknown',
                        avatar: p.avatarUrl || '',
                        connectionStatus: p.connectionStatus
                    }))}
                    isModerator={isModerator}
                />
             </div>
             
             <div className="p-6 bg-white border-t border-slate-200 z-10">
                <VotingDeck 
                    options={session.deckValues} 
                    selectedValue={myVote} 
                    onSelect={handleVote} 
                    onRetract={handleRetract}
                    disabled={currentIssue?.isRevealed || session.status !== 'active'}
                />
             </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
