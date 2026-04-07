"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

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
    showPlaceholder?: boolean;
    className?: string;
};

export function FormSelect({
    value,
    onChange,
    options,
    disabled = false,
    placeholder,
    showPlaceholder = true,
    className = "",
}: FormSelectProps) {
    const { t } = useLocale();
    const resolvedPlaceholder = placeholder ?? t.dashboard.form.selectPlaceholder;
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className={cn("select select-bordered w-full bg-base-100", className)}
        >
            {showPlaceholder && !value ? <option value="">{resolvedPlaceholder}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
