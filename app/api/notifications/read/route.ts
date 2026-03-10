import { NextResponse } from "next/server";
import { notificationReadSchema } from "@/lib/validators";
import { createNotificationService } from "@/lib/services/notification.service";
import { handleNotificationApiError, parseJsonBody, requireCurrentUser } from "@/lib/notification-route";

const notificationService = createNotificationService();

export async function POST(request: Request) {
    try {
        const user = await requireCurrentUser();
        const input = await parseJsonBody(request, notificationReadSchema);
        const notification = await notificationService.markAsRead(user.id, input.id);
        return NextResponse.json({ success: true, data: notification });
    } catch (error) {
        return handleNotificationApiError(error);
    }
}
