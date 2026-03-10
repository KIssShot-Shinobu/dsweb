"use client";

import { cn } from "@/lib/utils";

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
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className={cn("select select-bordered w-full bg-base-100", className)}
        >
            {!value ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
