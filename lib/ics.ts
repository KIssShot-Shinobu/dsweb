export const formatIcsDate = (value: Date) =>
    value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const escapeIcsText = (value: string) =>
    value
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");

type IcsEvent = {
    uid: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    url?: string;
};

export function buildIcsEvent(event: IcsEvent) {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DuelStandby//DSWeb//ID",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${escapeIcsText(event.uid)}`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(event.start)}`,
        `DTEND:${formatIcsDate(event.end)}`,
        `SUMMARY:${escapeIcsText(event.summary)}`,
    ];

    if (event.description) {
        lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    if (event.url) {
        lines.push(`URL:${escapeIcsText(event.url)}`);
    }

    lines.push("END:VEVENT", "END:VCALENDAR");
    return `${lines.join("\r\n")}\r\n`;
}
