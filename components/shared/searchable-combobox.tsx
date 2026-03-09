"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type SearchableOption = {
    value: string;
    label: string;
    description?: string;
};

type SearchableComboboxProps = {
    value: string;
    onChange: (option: SearchableOption) => void;
    options: SearchableOption[];
    placeholder: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    triggerClassName?: string;
    menuClassName?: string;
    inputClassName?: string;
    optionClassName?: string;
};

export function SearchableCombobox({
    value,
    onChange,
    options,
    placeholder,
    searchPlaceholder = "Cari...",
    emptyMessage = "Tidak ada hasil",
    disabled = false,
    triggerClassName = "",
    menuClassName = "",
    inputClassName = "",
    optionClassName = "",
}: SearchableComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [portalReady, setPortalReady] = useState(false);
    const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
    const rootRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const selected = useMemo(() => options.find((option) => option.value === value) || null, [options, value]);
    const filteredOptions = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return options;
        return options.filter((option) => `${option.label} ${option.description || ""}`.toLowerCase().includes(keyword));
    }, [options, search]);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    useEffect(() => {
        if (!open || !rootRef.current) return;

        const updatePosition = () => {
            if (!rootRef.current) return;
            const rect = rootRef.current.getBoundingClientRect();
            setMenuStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width });
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
            if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    useEffect(() => {
        if (!open) {
            setSearch("");
        }
    }, [open]);

    const dropdown = open && !disabled && portalReady
        ? createPortal(
              <>
                  <div className="fixed inset-0 z-[399]" onClick={() => setOpen(false)} />
                  <div
                      ref={menuRef}
                      className={`fixed z-[400] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#11161d] ${menuClassName}`.trim()}
                      style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
                  >
                      <div className="border-b border-black/5 p-3 dark:border-white/8">
                          <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/35" />
                              <input
                                  type="text"
                                  value={search}
                                  onChange={(event) => setSearch(event.target.value)}
                                  placeholder={searchPlaceholder}
                                  className={`w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition-all focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 dark:border-white/10 dark:bg-[#11161d] dark:text-white ${inputClassName}`.trim()}
                                  autoFocus
                              />
                          </div>
                      </div>

                      <div className="max-h-72 overflow-auto py-2">
                          {filteredOptions.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500 dark:text-white/45">{emptyMessage}</div>
                          ) : (
                              filteredOptions.map((option) => {
                                  const isSelected = option.value === value;
                                  return (
                                      <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => {
                                              onChange(option);
                                              setOpen(false);
                                          }}
                                          className={`flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                              isSelected
                                                  ? "bg-ds-amber/12 text-slate-950 dark:text-white"
                                                  : "text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                                          } ${optionClassName}`.trim()}
                                      >
                                          <span className="min-w-0">
                                              <span className="block truncate font-medium">{option.label}</span>
                                              {option.description ? <span className="mt-0.5 block text-xs text-gray-500 dark:text-white/40">{option.description}</span> : null}
                                          </span>
                                          {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-ds-amber" /> : null}
                                      </button>
                                  );
                              })
                          )}
                      </div>
                  </div>
              </>,
              document.body,
          )
        : null;

    return (
        <>
            <div ref={rootRef} className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen((current) => !current)}
                    className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-900 outline-none transition-all focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#11161d] dark:text-white ${triggerClassName}`.trim()}
                >
                    <span className={`${selected ? "" : "text-gray-400 dark:text-white/40"}`}>{selected?.label || placeholder}</span>
                    <ChevronDown className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform dark:text-white/50 ${open ? "rotate-180" : ""}`} />
                </button>
            </div>
            {dropdown}
        </>
    );
}
