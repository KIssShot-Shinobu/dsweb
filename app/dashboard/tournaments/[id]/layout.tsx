import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { TournamentAdminShell } from "@/components/dashboard/tournament-admin-shell";
import { requireDashboardUser } from "@/lib/dashboard-auth";
import { hasRole, ROLES } from "@/lib/auth";
import { canRefereeTournament } from "@/lib/tournament-staff";

export default async function TournamentAdminLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const user = await requireDashboardUser();
    const canManage = hasRole(user.role, ROLES.OFFICER);
    const canReferee = canManage || await canRefereeTournament(user.id, id);

    if (!canManage && !canReferee) {
        redirect("/dashboard/profile");
    }

    return (
        <TournamentAdminShell tournamentId={id} canManage={canManage} canReferee={canReferee}>
            {children}
        </TournamentAdminShell>
    );
}
