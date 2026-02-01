import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../ui/button';
import { Play, Pause, Check, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from '../ui/tooltip';
export function SessionControls({ session, isModerator, onPause, onResume, onComplete, onSettings, loading = false, }) {
    if (!isModerator) {
        return null; // Only moderators see controls
    }
    const isActive = session.status === 'active';
    const isPaused = session.status === 'paused';
    const isCompleted = session.status === 'completed';
    if (isCompleted) {
        return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-green-600 font-medium", children: [_jsx(Check, { className: "w-4 h-4" }), "Session Completed"] }));
    }
    return (_jsx(TooltipProvider, { children: _jsxs("div", { className: "flex items-center gap-2", children: [isActive && (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", onClick: onPause, disabled: loading, className: "gap-2", children: [_jsx(Pause, { className: "w-4 h-4" }), "Pause"] }) }), _jsx(TooltipContent, { children: "Temporarily pause the session" })] })), isPaused && (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", onClick: onResume, disabled: loading, className: "gap-2", children: [_jsx(Play, { className: "w-4 h-4" }), "Resume"] }) }), _jsx(TooltipContent, { children: "Resume the paused session" })] })), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "sm", onClick: onSettings, disabled: loading, children: _jsx(Settings, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: "Session settings" })] }), (isActive || isPaused) && (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(Button, { variant: "default", size: "sm", onClick: onComplete, disabled: loading, className: "bg-green-600 hover:bg-green-700 gap-2", children: [_jsx(Check, { className: "w-4 h-4" }), "Complete"] }) }), _jsx(TooltipContent, { children: "Finish and close this session" })] }))] }) }));
}
