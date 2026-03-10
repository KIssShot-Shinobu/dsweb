import { NextResponse } from "next/server";
import { createNotificationService } from "@/lib/services/notification.service";
import { handleNotificationApiError, requireCurrentUser } from "@/lib/notification-route";

const notificationService = createNotificationService();

export async function GET() {
    try {
        const user = await requireCurrentUser();
        const count = await notificationService.getUnreadCount(user.id);
        return NextResponse.json({ success: true, count });
    } catch (error) {
        return handleNotificationApiError(error);
    }
}
