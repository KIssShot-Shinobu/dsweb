"use client";

import { DateTimePicker } from "@mantine/dates";
import { DISPLAY_DATE_TIME_FORMAT, formatLocalDateTime, parseLocalDateTime } from "@/lib/datetime";

type DateTimePickerInputProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    required?: boolean;
    placeholder?: string;
    className?: string;
};

export function DateTimePickerInput({
    value,
    onChange,
    disabled,
    required,
    placeholder = "Pilih tanggal & waktu",
    className,
}: DateTimePickerInputProps) {
    return (
        <DateTimePicker
            value={parseLocalDateTime(value)}
            onChange={(date) => onChange(formatLocalDateTime(date))}
            valueFormat={DISPLAY_DATE_TIME_FORMAT}
            locale="id"
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            clearable={!required}
            withSeconds={false}
            timePickerProps={{ format: "24h" }}
            className={className}
            classNames={{
                input: "input input-bordered w-full",
                dropdown: "rounded-box border border-base-300 bg-base-100 text-base-content shadow-lg",
            }}
            popoverProps={{ withinPortal: true }}
        />
    );
}
