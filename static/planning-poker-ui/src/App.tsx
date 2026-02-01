import React, { useState, useEffect } from "react";
import { JiraHeader } from "./components/poker/JiraHeader";
import { SessionCard } from "./components/poker/SessionCard";
import { CreateSessionDialog } from "./components/poker/CreateSessionDialog";
import { WaitingRoom } from "./components/poker/WaitingRoom";
import { ActiveSession } from "./components/poker/ActiveSession";
import { Button } from "./components/ui/button";
import { Plus } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { view } from "@forge/bridge";
import * as api from "./api/forge";

type SessionStatus = "waiting" | "active" | "closed" | "completed";

export type SessionSummary = {
  id: string;
  name: string;
  deck: string;
  created: string;
  status: SessionStatus;
  currentIssueKey?: string | null;
  autoReveal?: boolean;
  allowChangeVote?: boolean;
  timerEnabled?: boolean;
  timerSeconds?: number;
  jql?: string;
};

export type AppState = "home" | "waiting" | "active";

export default function App() {
  const [viewState, setViewState] = useState<AppState>("home");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<SessionSummary | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectKey, setProjectKey] = useState<string | null>(null);

  useEffect(() => {
    const initContext = async () => {
        try {
            const context = await view.getContext();
            const key = context.extension.project?.key;
            
            if (key) {
                setProjectKey(key);
                loadSessions(key);
            } else {
                console.warn("No project key found in context");
                // Fallback or handle error? For now, we might be in a global context or testing.
                // If we are testing locally without context, this might fail.
                // But the user is deploying to Jira, so context should exist.
            }
        } catch (e) {
            console.error("Failed to get context", e);
            toast.error("Failed to load project context");
        }
    };
    initContext();
  }, []);

  const loadSessions = async (pKey: string) => {
    try {
      setLoading(true);
      const response = await api.listSessionsByProject(pKey) as any[]; 
      if (Array.isArray(response)) {
          // Map backend session to UI summary
          const mapped = response.map((s: any) => ({
              id: s.id,
              name: s.name,
              deck: s.deckType,
              created: new Date(s.createdAt).toLocaleDateString(), // Simple formatting
              status: s.status
          }));
          setSessions(mapped);
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (session: SessionSummary) => {
    try {
        setLoading(true);
        // Join session on backend to ensure we are a participant
        await api.joinSession(session.id);
        
        setCurrentSession(session);
        if (session.status === "waiting") setViewState("waiting");
        else setViewState("active");
    } catch (err) {
        console.error("Failed to join session", err);
        toast.error("Failed to join session");
    } finally {
        setLoading(false);
    }
  };

  const handleCreateSession = async (data: {
    name: string;
    deck: string;
    jql?: string | null;
  }) => {
    try {
        if (!projectKey) {
            toast.error("Project context not loaded");
            return;
        }
        const result = await api.createSession({
            projectKey,
            name: data.name,
            deckType: data.deck,
            deckValues: ['0', '1', '2', '3', '5', '8', '13', '21'], // Default values for now, should come from deck type
            jql: data.jql || undefined
        }) as { session: any };
        
        if (result && result.session) {
            const newSession: SessionSummary = {
              id: result.session.id,
              name: result.session.name,
              deck: result.session.deckType,
              created: "Just now",
              status: "waiting",
            };
            setSessions(prev => [newSession, ...prev]);
            setCurrentSession(newSession);
            setViewState("waiting");
            setIsCreateOpen(false);
            toast.success("Session created!");
        }
    } catch (err) {
        console.error("Failed to create session", err);
        toast.error("Failed to create session");
    }
  };

  const handleStartSession = () => {
    setViewState("active");
  };

  const handleBack = () => {
    setViewState("home");
    setCurrentSession(null);
    if (projectKey) {
        loadSessions(projectKey); // Refresh list
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <main className="max-w-6xl mx-auto p-6">
        {viewState === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Poker Sessions</h2>
                <p className="text-slate-500 mt-1">Join an active session or start a new estimation round.</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="bg-[#0052CC] hover:bg-[#0047B3]" disabled={!projectKey}>
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading sessions...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sessions.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed">
                          No sessions found. Create one to get started!
                      </div>
                  ) : (
                      sessions.map(session => (
                        <SessionCard 
                          key={session.id} 
                          session={session} 
                          onJoin={() => handleJoinSession(session)} 
                        />
                      ))
                  )}
                </div>
            )}
          </div>
        )}

        {viewState === 'waiting' && (
          <WaitingRoom 
            session={currentSession} 
            onStart={handleStartSession}
          />
        )}

        {viewState === 'active' && currentSession && (
          <ActiveSession 
            sessionId={currentSession.id}
          />
        )}
      </main>

      <CreateSessionDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateSession}
      />
      <Toaster />
    </div>
  );
}
