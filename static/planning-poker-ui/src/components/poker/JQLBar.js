import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
export function JQLBar({ onSearch, loading, initialValue }) {
    const [value, setValue] = React.useState(initialValue || "");
    // Update local state if initialValue changes (e.g. from session load)
    React.useEffect(() => {
        if (initialValue)
            setValue(initialValue);
    }, [initialValue]);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(value);
        }
    };
    return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1 max-w-lg", children: [_jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" }), _jsx(Input, { placeholder: "Filter issues (JQL supported)", className: "pl-9 h-9 bg-white text-sm", value: value, onChange: (e) => setValue(e.target.value), onKeyDown: handleKeyDown, disabled: loading })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs(Button, { variant: "ghost", size: "sm", className: "h-9 text-slate-500", onClick: () => onSearch && onSearch(value), disabled: loading, children: [_jsx(Filter, { className: "w-4 h-4 mr-2" }), "Apply Filter"] }) })] }));
}
