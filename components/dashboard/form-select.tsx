"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Option = {
    value: string;
    label: string;
};

type FormSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    disabled?: boolean;
    placeholder?: string;
    className?: string;
};

export function FormSelect({
    value,
    onChange,
    options,
    disabled = false,
    placeholder = "Pilih opsi",
    className = "",
}: FormSelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const selected = useMemo(
        () => options.find((o) => o.value === value),
        [options, value]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, []);

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-left text-gray-900 dark:text-white outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all disabled:opacity-60"
            >
                <span className={`${selected ? "" : "text-gray-400 dark:text-white/40"}`}>
                    {selected?.label || placeholder}
                </span>
                <ChevronDown
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && !disabled && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1b1b1b] shadow-lg overflow-hidden">
                    {options.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${isSelected
                                        ? "bg-ds-amber text-black font-semibold"
                                        : "text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

