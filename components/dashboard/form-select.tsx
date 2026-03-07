"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    const [portalReady, setPortalReady] = useState(false);
    const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
    const rootRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    useEffect(() => {
        if (!open || !rootRef.current) return;

        const updatePosition = () => {
            if (!rootRef.current) return;
            const rect = rootRef.current.getBoundingClientRect();
            setMenuStyle({
                top: rect.bottom + 6,
                left: rect.left,
                width: rect.width,
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedTrigger = rootRef.current?.contains(target);
            const clickedMenu = menuRef.current?.contains(target);

            if (!clickedTrigger && !clickedMenu) {
                setOpen(false);
            }
        };

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEsc);
        };
    }, []);

    const dropdown = open && !disabled && portalReady
        ? createPortal(
              <>
                  <div className="fixed inset-0 z-[399]" onClick={() => setOpen(false)} />
                  <div
                      ref={menuRef}
                      className="fixed z-[400] max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1b1b1b]"
                      style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
                  >
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
                                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                      isSelected
                                          ? "bg-ds-amber font-semibold text-black"
                                          : "text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                                  }`}
                              >
                                  {opt.label}
                              </button>
                          );
                      })}
                  </div>
              </>,
              document.body
          )
        : null;

    return (
        <>
            <div ref={rootRef} className={`relative ${className}`.trim()}>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen((v) => !v)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-900 outline-none transition-all focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                    <span className={`${selected ? "" : "text-gray-400 dark:text-white/40"}`}>{selected?.label || placeholder}</span>
                    <ChevronDown
                        className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform dark:text-white/50 ${open ? "rotate-180" : ""}`}
                    />
                </button>
            </div>
            {dropdown}
        </>
    );
}
