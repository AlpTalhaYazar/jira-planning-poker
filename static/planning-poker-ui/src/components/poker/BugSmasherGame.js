import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bug, Zap, Trophy, Play, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
export function BugSmasherGame() {
    const [isOpen, setIsOpen] = useState(false);
    const [gameState, setGameState] = useState('idle');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [entities, setEntities] = useState([]);
    const [leaderboard, setLeaderboard] = useState([
        { id: '2', name: 'Sarah Chen', score: 12, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
        { id: '3', name: 'Mike Ross', score: 8, avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop' },
    ]);
    const containerRef = useRef(null);
    const timerRef = useRef();
    const spawnerRef = useRef();
    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setTimeLeft(30);
        setEntities([]);
        // Game Loop
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
            // Mock opponent scoring
            if (Math.random() > 0.7) {
                setLeaderboard(prev => prev.map(p => ({
                    ...p,
                    score: p.score + (Math.random() > 0.5 ? 1 : 0)
                })).sort((a, b) => b.score - a.score));
            }
        }, 1000);
        // Spawner
        spawnerRef.current = setInterval(() => {
            spawnEntity();
        }, 600);
    };
    const endGame = () => {
        setGameState('finished');
        clearInterval(timerRef.current);
        clearInterval(spawnerRef.current);
        // Update leaderboard with current user
        setLeaderboard(prev => {
            const newScores = [...prev, { id: '1', name: 'You', score: score }];
            return newScores.sort((a, b) => b.score - a.score);
        });
    };
    const spawnEntity = () => {
        if (!containerRef.current)
            return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 40;
        const newEntity = {
            id: Math.random().toString(36).substr(2, 9),
            x: Math.random() * (width - padding * 2) + padding,
            y: Math.random() * (height - padding * 2) + padding,
            type: Math.random() > 0.8 ? 'feature' : 'bug', // 20% chance of feature
            createdAt: Date.now(),
        };
        setEntities(prev => [...prev, newEntity]);
        // Auto remove after 2s
        setTimeout(() => {
            setEntities(prev => prev.filter(e => e.id !== newEntity.id));
        }, 2000);
    };
    const handleEntityClick = (id, type) => {
        if (gameState !== 'playing')
            return;
        if (type === 'bug') {
            setScore(s => s + 1);
        }
        else {
            setScore(s => Math.max(0, s - 1)); // Penalty
        }
        setEntities(prev => prev.filter(e => e.id !== id));
    };
    // Cleanup
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            clearInterval(spawnerRef.current);
        };
    }, []);
    if (!isOpen) {
        return (_jsx(Card, { className: "border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-indigo-50 cursor-pointer hover:border-indigo-300 transition-all group", onClick: () => setIsOpen(true), children: _jsxs(CardContent, { className: "p-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-white rounded-lg border border-slate-200 text-[#DE350B] shadow-sm group-hover:scale-110 transition-transform", children: _jsx(Bug, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-slate-900", children: "Bug Smasher Blitz" }), _jsx("p", { className: "text-xs text-slate-500", children: "Waiting for others? Smash some bugs!" })] })] }), _jsxs(Button, { size: "sm", variant: "ghost", className: "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50", children: ["Play ", _jsx(Play, { className: "w-4 h-4 ml-1 fill-current" })] })] }) }));
    }
    return (_jsxs(Card, { className: "border-slate-200 shadow-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-1.5 bg-[#DE350B]/10 rounded text-[#DE350B]", children: _jsx(Bug, { className: "w-4 h-4" }) }), _jsx("h3", { className: "font-semibold text-slate-900", children: "Bug Smasher Blitz" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [gameState === 'playing' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "text-sm font-mono font-medium text-slate-600 bg-white px-2 py-1 rounded border border-slate-200", children: [String(Math.floor(timeLeft / 60)).padStart(2, '0'), ":", String(timeLeft % 60).padStart(2, '0')] }), _jsxs(Badge, { variant: "secondary", className: "font-mono text-lg bg-indigo-50 text-indigo-700 border-indigo-100", children: ["Score: ", score] })] })), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => setIsOpen(false), className: "h-8 w-8", children: _jsx(X, { className: "w-4 h-4" }) })] })] }), _jsxs(CardContent, { className: "p-0 relative min-h-[400px] bg-slate-50", children: [gameState === 'idle' && (_jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 backdrop-blur-sm", children: _jsxs("div", { className: "text-center space-y-4 max-w-sm mx-auto p-6", children: [_jsx("div", { className: "w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600", children: _jsx(Bug, { className: "w-8 h-8" }) }), _jsx("h2", { className: "text-2xl font-bold text-slate-900", children: "Ready to Smash?" }), _jsxs("p", { className: "text-slate-500", children: ["Click the ", _jsx("span", { className: "text-[#DE350B] font-bold", children: "Red Bugs" }), " for points. Avoid the ", _jsx("span", { className: "text-[#006644] font-bold", children: "Green Features" }), "!"] }), _jsx(Button, { size: "lg", onClick: startGame, className: "w-full bg-[#0052CC] hover:bg-[#0047B3]", children: "Start Game" })] }) })), gameState === 'finished' && (_jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/90 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-xs space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx(Trophy, { className: "w-12 h-12 text-amber-400 mx-auto mb-2" }), _jsx("h2", { className: "text-2xl font-bold text-slate-900", children: "Game Over!" }), _jsxs("p", { className: "text-slate-500", children: ["You scored ", _jsx("span", { className: "font-bold text-slate-900", children: score }), " points"] })] }), _jsxs("div", { className: "bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden", children: [_jsx("div", { className: "px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase", children: "Session Leaderboard" }), leaderboard.map((player, index) => (_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "text-sm font-mono text-slate-400 w-4", children: ["#", index + 1] }), _jsxs(Avatar, { className: "w-6 h-6", children: [_jsx(AvatarImage, { src: player.avatar }), _jsx(AvatarFallback, { children: player.name.charAt(0) })] }), _jsxs("span", { className: `text-sm ${player.id === '1' ? 'font-bold text-slate-900' : 'text-slate-600'}`, children: [player.name, " ", player.id === '1' && '(You)'] })] }), _jsx("span", { className: "font-mono font-bold text-slate-700", children: player.score })] }, player.id)))] }), _jsxs(Button, { onClick: startGame, variant: "outline", className: "w-full", children: [_jsx(RotateCcw, { className: "w-4 h-4 mr-2" }), " Play Again"] })] }) })), _jsx("div", { ref: containerRef, className: "relative w-full h-[400px] overflow-hidden cursor-crosshair", children: _jsx(AnimatePresence, { children: entities.map((entity) => (_jsx(motion.button, { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 1.5, opacity: 0 }, style: {
                                    left: entity.x,
                                    top: entity.y,
                                    position: 'absolute'
                                }, onClick: () => handleEntityClick(entity.id, entity.type), className: `
                  p-2 rounded-full shadow-sm transition-transform active:scale-90
                  ${entity.type === 'bug'
                                    ? 'bg-[#DE350B] text-white hover:bg-[#BF2600]'
                                    : 'bg-[#006644] text-white hover:bg-[#004D33]'}
                `, children: entity.type === 'bug' ? _jsx(Bug, { className: "w-5 h-5" }) : _jsx(Zap, { className: "w-5 h-5" }) }, entity.id))) }) })] })] }));
}
