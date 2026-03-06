import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        // Hanya role FOUNDER
        if (!currentUser || !hasRole(currentUser.role, "FOUNDER")) {
            return NextResponse.json({ success: false, message: "Hanya Founder yang dapat export log" }, { status: 403 });
        }

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Tulis Header CSV
                    const header = "ID,Waktu,User ID,Email,Aksi,Target ID,Tipe Target,IP Address,Method,Path,Status,Reason,Details\n";
                    controller.enqueue(encoder.encode(header));

                    const batchSize = 1000;
                    let cursor: string | undefined = undefined;
                    let keepFetching = true;

                    while (keepFetching) {
                        const dbLogs: any[] = await prisma.auditLog.findMany({
                            take: batchSize,
                            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
                            orderBy: { id: "asc" },
                            include: { user: { select: { email: true } } },
                        });

                        if (dbLogs.length === 0) {
                            keepFetching = false;
                            break;
                        }

                        let chunk = "";
                        for (const log of dbLogs) {
                            // Escape fields for CSV if they contain commas or quotes
                            const safeDetails = log.details
                                ? `"${log.details.replace(/"/g, '""')}"`
                                : "";

                            const safeReason = log.reason ? `"${log.reason.replace(/"/g, '""')}"` : "";

                            const row = [
                                log.id,
                                log.createdAt.toISOString(),
                                log.userId,
                                log.user?.email || "",
                                log.action,
                                log.targetId || "",
                                log.targetType || "",
                                log.ipAddress,
                                log.requestMethod || "",
                                log.requestPath || "",
                                log.responseStatus || "",
                                safeReason,
                                safeDetails
                            ].join(",");

                            chunk += row + "\n";
                        }

                        controller.enqueue(encoder.encode(chunk));
                        cursor = dbLogs[dbLogs.length - 1].id;
                    }
                } catch (err) {
                    console.error("[Audit Logs Export Stream Error]", err);
                } finally {
                    controller.close();
                }
            }
        });

        // Set headers untuk force download CSV
        const headers = new Headers();
        headers.set("Content-Type", "text/csv");
        headers.set("Content-Disposition", 'attachment; filename="audit_logs.csv"');

        return new NextResponse(stream, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error("[Audit Logs Export API Error]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
