import { NextRequest, NextResponse } from "next/server";
import { notificationQuerySchema } from "@/lib/validators";
import { createNotificationService } from "@/lib/services/notification.service";
import { handleNotificationApiError, requireCurrentUser } from "@/lib/notification-route";

const notificationService = createNotificationService();

export async function GET(request: NextRequest) {
    try {
        const user = await requireCurrentUser();
        const { searchParams } = new URL(request.url);
        const parsed = notificationQuerySchema.safeParse({
            page: searchParams.get("page") || undefined,
            limit: searchParams.get("limit") || undefined,
        });

        if (!parsed.success) {
            return NextResponse.json({ success: false, error: "Query tidak valid" }, { status: 400 });
        }

        const result = await notificationService.getUserNotifications(user.id, parsed.data);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return handleNotificationApiError(error);
    }
}
