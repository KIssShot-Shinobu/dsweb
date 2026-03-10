"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function TeamDetailActions({
    teamId,
    teamSlug,
    pendingInviteId,
    canManage,
    canLeave,
    hasActiveTeam,
    isMember,
}: {
    teamId: string;
    teamSlug: string;
    pendingInviteId: string | null;
    canManage: boolean;
    canLeave: boolean;
    hasActiveTeam: boolean;
    isMember: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const runAction = async (url: string, body: Record<string, string>, successRedirect?: string) => {
        setError(null);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json();

        if (!response.ok) {
            setError(data.error || data.message || "Aksi gagal diproses");
            return;
        }

        startTransition(() => {
            if (successRedirect) {
                router.push(successRedirect);
                return;
            }

            router.refresh();
        });
    };

    return (
        <div className="space-y-3">
            {error ? <div className="alert alert-error">{error}</div> : null}
            <div className="flex flex-wrap gap-2">
                <Link href="/teams" className="btn btn-outline btn-sm">
                    Kembali ke Teams
                </Link>
                {canManage ? (
                    <Link href={`/teams/${teamSlug}/manage`} className="btn btn-secondary btn-sm">
                        Manage Team
                    </Link>
                ) : null}
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
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => runAction("/api/team/request-join", { teamId })}
                        disabled={isPending}
                    >
                        Request Join
                    </button>
                ) : null}
                {isMember && canLeave ? (
                    <button
                        type="button"
                        className="btn btn-outline btn-warning btn-sm"
                        onClick={() => runAction("/api/team/leave", { teamId }, "/teams")}
                        disabled={isPending}
                    >
                        Leave Team
                    </button>
                ) : null}
            </div>
        </div>
    );
}
