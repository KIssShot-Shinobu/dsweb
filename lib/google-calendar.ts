import { formatIcsDate } from "@/lib/ics";

type GoogleCalendarEvent = {
    title: string;
    start: Date;
    end: Date;
    details?: string;
    location?: string;
    timeZone?: string;
};

export function buildGoogleCalendarUrl(event: GoogleCalendarEvent) {
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: event.title,
        dates: `${formatIcsDate(event.start)}/${formatIcsDate(event.end)}`,
    });

    if (event.details) params.set("details", event.details);
    if (event.location) params.set("location", event.location);
    if (event.timeZone) params.set("ctz", event.timeZone);

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
