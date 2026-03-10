import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/notification-route";
import { subscribeToNotifications, unsubscribeFromNotifications } from "@/lib/notification-realtime";

export const dynamic = "force-dynamic";

export async function GET() {
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

    try {
        const user = await requireCurrentUser();

        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controllerRef = controller;
                subscribeToNotifications(user.id, controller);
            },
            cancel() {
                if (controllerRef) {
                    unsubscribeFromNotifications(user.id, controllerRef);
                }
            },
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
