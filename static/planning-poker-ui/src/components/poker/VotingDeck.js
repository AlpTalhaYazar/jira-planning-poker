import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { cn } from '../ui/utils';
export function VotingDeck({ options, selectedValue, onSelect, onRetract, disabled }) {
    return (_jsx("div", { className: "w-full max-w-4xl mx-auto", children: _jsx("div", { className: "flex flex-wrap items-center justify-center gap-3", children: options.map((value) => {
                const isSelected = selectedValue === value;
                return (_jsx(motion.button, { whileHover: !disabled ? { y: -8 } : {}, whileTap: !disabled ? { scale: 0.95 } : {}, onClick: () => {
                        if (disabled)
                            return;
                        if (isSelected && onRetract) {
                            onRetract();
                        }
                        else {
                            onSelect(value);
                        }
                    }, disabled: disabled, className: cn("relative w-12 h-16 sm:w-14 sm:h-20 rounded-lg border-2 flex items-center justify-center text-lg font-bold shadow-sm transition-colors", isSelected
                        ? "bg-[#0052CC] border-[#0052CC] text-white shadow-lg ring-2 ring-offset-2 ring-[#0052CC]"
                        : "bg-white border-slate-200 text-slate-700 hover:border-[#0052CC]/50", disabled && "opacity-50 cursor-not-allowed hover:border-slate-200 hover:y-0"), children: value }, value));
            }) }) }));
}
