import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
export function CreateSessionDialog({ open, onOpenChange, onSubmit }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: String(formData.get("name") ?? ""),
            deck: String(formData.get("deck") ?? ""),
            jql: formData.get("jql") ?? null,
        };
        onSubmit(data);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-[500px]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Create New Session" }), _jsx(DialogDescription, { children: "Configure your poker session details. You can change these later if needed." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Session Name" }), _jsx(Input, { id: "name", name: "name", placeholder: "e.g. Sprint 24 Planning", required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "deck", children: "Estimation Deck" }), _jsxs(Select, { name: "deck", defaultValue: "Fibonacci", children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select a deck" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Fibonacci", children: "Fibonacci (0, 0.5, 1, 2, 3...)" }), _jsx(SelectItem, { value: "T-Shirt", children: "T-Shirt Sizes (XS, S, M, L...)" }), _jsx(SelectItem, { value: "Powers", children: "Powers of 2 (0, 1, 2, 4, 8...)" })] })] }), _jsx("p", { className: "text-xs text-slate-500", children: "Determines the card values available to participants." })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "jql", children: "JQL Filter (Optional)" }), _jsx(Textarea, { id: "jql", name: "jql", placeholder: "project = 'PAY' AND sprint in openSprints()", className: "font-mono text-xs" }), _jsx("p", { className: "text-xs text-slate-500", children: "Pre-load issues matching this query." })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", className: "bg-[#0052CC] hover:bg-[#0047B3]", children: "Create Session" })] })] })] }) }));
}
