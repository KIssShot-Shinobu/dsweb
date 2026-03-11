"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/dashboard/toast";

export function TeamDetailActions({
    teamId,
    pendingInviteId,
    hasActiveTeam,
    isMember,
    hasPendingJoin,
}: {
    teamId: string;
    pendingInviteId: string | null;
    hasActiveTeam: boolean;
    isMember: boolean;
    hasPendingJoin: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { success, error: toastError, info } = useToast();

    const runAction = async (url: string, body: Record<string, string>, successRedirect?: string) => {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json();

        if (!response.ok) {
            toastError(data.error || data.message || "Aksi gagal diproses");
            return false;
        }

        if (!successRedirect) {
            success("Aksi berhasil diproses.");
        }
        startTransition(() => {
            if (successRedirect) {
                router.push(successRedirect);
                return;
            }

            router.refresh();
        });
        return true;
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <Link href="/teams" className="btn btn-outline btn-sm">
                    Kembali ke Teams
                </Link>
                {pendingInviteId ? (
                    <>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => runAction("/api/team/invite/accept", { inviteId: pendingInviteId })}
                            disabled={isPending || hasActiveTeam}
                        >
                            Terima Invite
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline btn-error btn-sm"
                            onClick={() => runAction("/api/team/invite/decline", { inviteId: pendingInviteId })}
                            disabled={isPending}
                        >
                            Tolak Invite
                        </button>
                    </>
                ) : null}
                {!isMember && !pendingInviteId && !hasActiveTeam ? (
                    hasPendingJoin ? (
                        <button type="button" className="btn btn-outline btn-sm" disabled>
                            Menunggu Persetujuan
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                                const ok = await runAction("/api/team/request-join", { teamId });
                                if (ok) {
                                    info("Request join dikirim. Menunggu persetujuan admin team.");
                                }
                            }}
                            disabled={isPending}
                        >
                            Request Join
                        </button>
                    )
                ) : null}
            </div>
        </div>
    );
}
