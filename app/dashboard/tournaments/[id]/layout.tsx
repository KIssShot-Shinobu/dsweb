import type { ReactNode } from "react";
import { TournamentAdminShell } from "@/components/dashboard/tournament-admin-shell";

export default async function TournamentAdminLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <TournamentAdminShell tournamentId={id}>{children}</TournamentAdminShell>;
}
