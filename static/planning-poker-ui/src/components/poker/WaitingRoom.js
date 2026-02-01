import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Copy, Play, CheckCircle2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '../../hooks/useSession';
import * as api from '../../api/forge';
import { BugSmasherGame } from './BugSmasherGame';
export function WaitingRoom({ session: initialSession, onStart }) {
    // We use the hook to get real-time participants
    const { session: sessionData, loading, error } = useSession(initialSession.id);
    const [myAccountId, setMyAccountId] = useState(null);
    useEffect(() => {
        api.getUserActiveSession().then((data) => {
            if (data?.accountId) {
                setMyAccountId(data.accountId);
            }
        }).catch(console.error);
    }, []);
    const participants = sessionData?.participants || [];
    const session = sessionData?.session || initialSession;
    const me = participants.find((p) => p.accountId === myAccountId);
    const isReady = me?.isReady;
    const isHost = me?.isModerator;
    const toggleReady = async () => {
        try {
            await api.toggleReady(session.id, !isReady);
        }
        catch (err) {
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
        }
        catch (err) {
            toast.error('Failed to start session');
        }
    };
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Session link copied to clipboard');
    };
    const readyCount = participants.filter((p) => p.isReady).length;
    return (_jsxs("div", { className: "max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300", children: [_jsxs("div", { className: "text-center mb-10 space-y-4", children: [_jsx(Badge, { variant: "outline", className: "px-3 py-1 text-sm border-amber-200 bg-amber-50 text-amber-700", children: "Waiting for players" }), _jsx("h1", { className: "text-4xl font-bold text-slate-900 tracking-tight", children: session.name }), _jsxs("div", { className: "flex items-center justify-center gap-4 text-slate-500", children: [_jsxs("p", { children: ["Session ID: #", session.id] }), _jsx("span", { className: "text-slate-300", children: "|" }), _jsxs("button", { onClick: copyLink, className: "flex items-center gap-2 hover:text-[#0052CC] transition-colors", children: [_jsx(Copy, { className: "w-4 h-4" }), "Copy Invite Link"] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8", children: [_jsxs(Card, { className: "md:col-span-2 border-slate-200 shadow-sm", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between pb-2", children: [_jsxs(CardTitle, { className: "text-lg font-medium", children: ["Participants (", participants.length, ")"] }), _jsxs("div", { className: "text-sm text-slate-500", children: [readyCount, "/", participants.length, " Ready"] })] }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4", children: [participants.map((p) => (_jsxs("div", { className: `
                    relative flex flex-col items-center p-6 rounded-xl border transition-all
                    ${p.isReady
                                                ? 'bg-emerald-50/50 border-emerald-200'
                                                : 'bg-slate-50 border-slate-100'}
                  `, children: [p.isReady && (_jsx("div", { className: "absolute top-2 right-2 text-emerald-600", children: _jsx(CheckCircle2, { className: "w-5 h-5" }) })), _jsxs(Avatar, { className: "w-16 h-16 mb-3 border-2 border-white shadow-sm", children: [_jsx(AvatarImage, { src: p.avatarUrl }), _jsx(AvatarFallback, { className: "bg-slate-200 text-slate-500", children: (p.displayName || p.name)?.charAt(0) || '?' })] }), _jsx("span", { className: "font-medium text-slate-900", children: p.displayName || p.name || 'Unknown' }), p.isModerator && _jsx(Badge, { variant: "secondary", className: "mt-2 text-xs", children: "Host" })] }, p.accountId))), _jsxs("div", { className: "flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400", children: [_jsx(User, { className: "w-8 h-8 mb-2 opacity-50" }), _jsx("span", { className: "text-sm", children: "Waiting..." })] })] }) })] }), _jsxs("div", { className: "space-y-6", children: [_jsx(Card, { className: "border-slate-200 shadow-sm bg-white", children: _jsxs(CardContent, { className: "p-6 space-y-6", children: [_jsxs("div", { className: "text-center space-y-2", children: [_jsx("h3", { className: "font-medium text-slate-900", children: "Are you ready?" }), _jsx("p", { className: "text-sm text-slate-500", children: "Let the host know you're ready to estimate." })] }), _jsx(Button, { size: "lg", className: `w-full ${isReady ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-[#0052CC] hover:bg-[#0047B3]'}`, onClick: toggleReady, children: isReady ? 'Not Ready' : 'I\'m Ready' })] }) }), _jsx(BugSmasherGame, {}), session.status !== 'active' && isHost && (_jsxs("div", { className: "space-y-2", children: [_jsxs(Button, { size: "lg", className: `w-full ${readyCount < participants.length ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'}`, onClick: handleStartSession, disabled: readyCount < participants.length, children: [_jsx(Play, { className: "w-4 h-4 mr-2" }), "Start Session"] }), readyCount < participants.length && (_jsxs("p", { className: "text-xs text-center text-slate-500", children: ["Waiting for all participants to be ready (", readyCount, "/", participants.length, ")"] }))] }))] })] })] }));
}
