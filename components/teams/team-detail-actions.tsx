"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";

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
    const { t } = useLocale();
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
            toastError(data.error || data.message || t.teams.public.actions.actionFailed);
            return false;
        }

        if (!successRedirect) {
            success(t.teams.public.actions.actionSuccess);
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
                    {t.teams.public.actions.backToTeams}
                </Link>
                {pendingInviteId ? (
                    <>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => runAction("/api/team/invite/accept", { inviteId: pendingInviteId })}
                            disabled={isPending || hasActiveTeam}
                        >
                            {t.teams.public.actions.acceptInvite}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline btn-error btn-sm"
                            onClick={() => runAction("/api/team/invite/decline", { inviteId: pendingInviteId })}
                            disabled={isPending}
                        >
                            {t.teams.public.actions.declineInvite}
                        </button>
                    </>
                ) : null}
                {!isMember && !pendingInviteId && !hasActiveTeam ? (
                    hasPendingJoin ? (
                        <button type="button" className="btn btn-outline btn-sm" disabled>
                            {t.teams.public.actions.pendingApproval}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                                const ok = await runAction("/api/team/request-join", { teamId });
                                if (ok) {
                                    info(t.teams.public.actions.joinPendingInfo);
                                }
                            }}
                            disabled={isPending}
                        >
                            {t.teams.public.actions.requestJoin}
                        </button>
                    )
                ) : null}
            </div>
        </div>
    );
}
