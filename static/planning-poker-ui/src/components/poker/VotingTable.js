import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Eye, RotateCcw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
export function VotingTable({ votes, isRevealed, onReveal, finalEstimate, onSubmitEstimate, participants = [], isModerator = false }) {
    // Calculate stats if revealed
    const voteValues = Object.values(votes).filter(v => v !== '?' && v !== '☕').map(Number);
    const average = voteValues.length ? (voteValues.reduce((a, b) => a + b, 0) / voteValues.length).toFixed(1) : 0;
    const agreement = voteValues.every(v => v === voteValues[0]) && voteValues.length > 0;
    const [manualEstimate, setManualEstimate] = React.useState('');
    return (_jsxs("div", { className: "flex flex-col items-center w-full max-w-3xl gap-12", children: [_jsxs("div", { className: "relative w-full aspect-[2/1] max-h-[300px] bg-indigo-50/50 rounded-full border-4 border-indigo-100 flex items-center justify-center", children: [_jsx("div", { className: "z-10 text-center", children: !isRevealed ? (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "text-4xl font-bold text-indigo-900/20 tracking-widest", children: "VOTING" }), isModerator && (_jsxs(Button, { size: "lg", onClick: onReveal, className: "bg-[#0052CC] hover:bg-[#0047B3] shadow-lg shadow-blue-500/20", children: [_jsx(Eye, { className: "w-4 h-4 mr-2" }), "Reveal Cards"] })), !isModerator && (_jsx("div", { className: "text-sm text-slate-500", children: "Waiting for host to reveal" }))] })) : (_jsxs("div", { className: "animate-in zoom-in duration-300 space-y-2", children: [agreement && (_jsx("div", { className: "text-emerald-600 font-bold text-lg mb-2 animate-bounce", children: "Agreement!" })), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-6 mt-2", children: [_jsxs("div", { className: "text-center sm:text-left", children: [_jsx("div", { className: "text-xs text-slate-500 uppercase tracking-[0.2em] font-semibold", children: "Average" }), _jsx("div", { className: "text-5xl font-bold text-slate-900 leading-tight", children: average })] }), !finalEstimate && isModerator && (_jsxs("div", { className: "flex items-center gap-3 bg-white/70 border border-slate-200 rounded-full px-3 py-2 shadow-sm", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => onSubmitEstimate(String(Math.round(Number(average)))), className: "whitespace-nowrap", children: ["Use Avg (", Math.round(Number(average)), ")"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", className: "w-20 h-8 text-sm border border-slate-200 rounded px-2 text-center bg-white", placeholder: "Custom", value: manualEstimate, onChange: (e) => setManualEstimate(e.target.value) }), _jsx(Button, { size: "sm", onClick: () => onSubmitEstimate(manualEstimate), disabled: !manualEstimate, children: "Apply" })] })] }))] }), finalEstimate ? (_jsxs("div", { className: "mt-4 flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full", children: [_jsx(Check, { className: "w-4 h-4" }), "Final: ", finalEstimate] })) : (_jsx("div", { className: "mt-4 text-slate-500 text-sm", children: "Waiting for moderator..." }))] })) }), participants.map((p, i) => {
                        // Simple positioning logic
                        // We need to distribute them around the circle.
                        // Let's use simple absolute positioning based on index for now, 
                        // or a better circular distribution if we had time.
                        // Reusing the 4-position logic for now but making it dynamic?
                        // Actually, let's just stick to the 4-position logic if count <= 4, 
                        // otherwise we might need a better layout. 
                        // For MVP, let's just map up to 8 spots or so.
                        const total = participants.length;
                        // Calculate angle
                        const angle = (i * (360 / total)) + 90; // Start from bottom?
                        // This is getting complex for CSS. Let's stick to the previous hardcoded positions if <= 4
                        // or just use a simple grid if many.
                        // The previous code had specific classes.
                        const positions = [
                            "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", // 1
                            "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", // 2
                            "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2", // 3
                            "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", // 4
                            // Add more just in case
                            "bottom-0 right-1/4 translate-y-1/2",
                            "bottom-0 left-1/4 translate-y-1/2",
                        ];
                        const posClass = positions[i] || positions[0]; // Fallback
                        // We need to map vote by accountId or id
                        const hasVoted = !!votes[p.accountId];
                        const voteVal = votes[p.accountId];
                        return (_jsxs("div", { className: `absolute ${posClass} flex flex-col items-center gap-2`, children: [_jsx("div", { className: "relative", children: _jsx(AnimatePresence, { mode: "wait", children: isRevealed && hasVoted ? (_jsx(motion.div, { initial: { rotateY: 90 }, animate: { rotateY: 0 }, className: "w-10 h-14 bg-white border-2 border-[#0052CC] rounded shadow-sm flex items-center justify-center font-bold text-[#0052CC]", children: voteVal }, "revealed")) : (_jsx("div", { className: `
                            w-10 h-14 rounded border-2 transition-all duration-300 shadow-sm
                            ${hasVoted
                                                ? 'bg-[#0052CC] border-[#0052CC] -translate-y-2 shadow-md'
                                                : 'bg-slate-100 border-slate-200 border-dashed'}
                        `, children: hasVoted && _jsx("div", { className: "w-full h-full flex items-center justify-center text-white/20 font-bold text-xs", children: "?" }) })) }) }), _jsxs("div", { className: "flex flex-col items-center relative", children: [_jsxs("div", { className: "relative", children: [_jsxs(Avatar, { className: "w-8 h-8 border-2 border-white shadow-sm", children: [_jsx(AvatarImage, { src: p.avatar }), _jsx(AvatarFallback, { className: "bg-indigo-100 text-indigo-600 text-xs", children: p.name.charAt(0) })] }), p.connectionStatus && (_jsx("span", { className: `absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${p.connectionStatus === 'online' ? 'bg-emerald-500' :
                                                        p.connectionStatus === 'away' ? 'bg-amber-500' : 'bg-slate-300'}` }))] }), _jsx("span", { className: "text-xs font-medium text-slate-600 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm mt-1", children: p.name })] })] }, p.id));
                    })] }), isModerator && isRevealed && !finalEstimate && (_jsxs("div", { className: "w-full bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between animate-in slide-in-from-bottom-2", children: [_jsxs("div", { className: "text-sm text-slate-600", children: ["Consensus suggested: ", _jsx("span", { className: "font-bold text-slate-900", children: average })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs(Button, { variant: "ghost", size: "sm", className: "text-slate-500", children: [_jsx(RotateCcw, { className: "w-4 h-4 mr-2" }), "Re-vote"] }) })] }))] }));
}
