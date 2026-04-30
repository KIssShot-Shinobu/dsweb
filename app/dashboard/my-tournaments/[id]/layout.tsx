import type { ReactNode } from "react";
import { TournamentPlayerShell } from "@/components/dashboard/tournament-player-shell";
import { formatDate } from "@/lib/i18n/format";
import { getServerDictionary } from "@/lib/i18n/server";
import { getTournamentWorkspaceOrRedirect } from "./workspace";

export default async function MyTournamentWorkspaceLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { locale, t } = await getServerDictionary();
    const { tournament } = await getTournamentWorkspaceOrRedirect(id);

    const tournamentMeta = `${tournament.game.name} ${t.dashboard.tournamentPlayerShell.metaSeparator} ${formatDate(
        tournament.startAt,
        locale
    )}`;

    return (
        <TournamentPlayerShell tournamentId={id} tournamentTitle={tournament.title} tournamentMeta={tournamentMeta}>
            {children}
        </TournamentPlayerShell>
    );
}
