"use client";

import dynamic from "next/dynamic";

const TournamentBracket = dynamic(() => import("@/components/public/tournament-bracket"), { ssr: false });

export function TournamentBracketSection({
    tournamentId,
    structure,
}: {
    tournamentId: string;
    structure: "SINGLE_ELIM" | "DOUBLE_ELIM" | "SWISS";
}) {
    return <TournamentBracket tournamentId={tournamentId} structure={structure} />;
}

export default TournamentBracketSection;
