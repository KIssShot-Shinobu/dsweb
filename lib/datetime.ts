import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/id";

dayjs.extend(customParseFormat);
dayjs.locale("id");

export const LOCAL_DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm";
export const DISPLAY_DATE_TIME_FORMAT = "DD MMM YYYY HH:mm";

export function parseLocalDateTime(value: string | null | undefined) {
    if (!value) return null;
    const parsed = dayjs(value, [LOCAL_DATE_TIME_FORMAT, "YYYY-MM-DD HH:mm:ss", dayjs.ISO_8601], "id", true);
    return parsed.isValid() ? parsed.toDate() : null;
}

export function formatLocalDateTime(value: Date | null | undefined) {
    if (!value) return "";
    return dayjs(value).format(LOCAL_DATE_TIME_FORMAT);
}
