"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

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
    searchPlaceholder,
    emptyMessage,
    disabled = false,
    triggerClassName = "",
    menuClassName = "",
    inputClassName = "",
    optionClassName = "",
}: SearchableComboboxProps) {
    const { t } = useLocale();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
    const rootRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const resolvedSearchPlaceholder = searchPlaceholder ?? t.common.searchPlaceholder;
    const resolvedEmptyMessage = emptyMessage ?? t.common.emptySearch;

    const selected = useMemo(() => options.find((option) => option.value === value) || null, [options, value]);
    const filteredOptions = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return options;
        return options.filter((option) => `${option.label} ${option.description || ""}`.toLowerCase().includes(keyword));
    }, [options, search]);

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
                setSearch("");
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                setSearch("");
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const dropdown = open && !disabled && typeof document !== "undefined"
        ? createPortal(
              <>
                  <div className="fixed inset-0 z-[399]" onClick={() => { setOpen(false); setSearch(""); }} />
                  <div
                      ref={menuRef}
                      className={cn("fixed z-[400] overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-2xl", menuClassName)}
                      style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
                  >
                      <div className="border-b border-base-300 p-3">
                          <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
                              <input
                                  type="text"
                                  value={search}
                                  onChange={(event) => setSearch(event.target.value)}
                                  placeholder={resolvedSearchPlaceholder}
                                  className={cn("input input-bordered w-full bg-base-100 pl-9", inputClassName)}
                                  autoFocus
                              />
                          </div>
                      </div>

                      <div className="max-h-72 overflow-auto py-2">
                          {filteredOptions.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-base-content/55">{resolvedEmptyMessage}</div>
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
                                              setSearch("");
                                          }}
                                          className={cn(
                                              "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                                              isSelected ? "bg-primary/12 text-base-content" : "text-base-content/80 hover:bg-base-200",
                                              optionClassName,
                                          )}
                                      >
                                          <span className="min-w-0">
                                              <span className="block truncate font-medium">{option.label}</span>
                                              {option.description ? <span className="mt-0.5 block text-xs text-base-content/45">{option.description}</span> : null}
                                          </span>
                                          {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
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
                    onClick={() => {
                        setOpen((current) => !current);
                        if (open) setSearch("");
                    }}
                    className={cn("select select-bordered flex w-full items-center justify-between bg-base-100 text-left", triggerClassName)}
                >
                    <span className={selected ? "" : "text-base-content/40"}>{selected?.label || placeholder}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-base-content/50 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
            </div>
            {dropdown}
        </>
    );
}
