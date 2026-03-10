import { NextResponse } from "next/server";
import { createNotificationService } from "@/lib/services/notification.service";
import { handleNotificationApiError, requireCurrentUser } from "@/lib/notification-route";

const notificationService = createNotificationService();

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCurrentUser();
        const { id } = await params;
        await notificationService.deleteNotification(user.id, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleNotificationApiError(error);
    }
}
