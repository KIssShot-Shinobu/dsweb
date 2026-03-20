import { ROLES, hasRole } from "@/lib/auth";
import { canRefereeTournament } from "@/lib/tournament-staff";

const TEAM_CHAT_ROLES = ["CAPTAIN", "VICE_CAPTAIN", "MANAGER"] as const;

type ChatUser = {
    id: string;
    role: string;
    teamId?: string | null;
    teamMembershipRole?: string | null;
};

type MatchAccessSnapshot = {
    tournamentId: string;
    playerA: { userId: string | null; teamId: string | null } | null;
    playerB: { userId: string | null; teamId: string | null } | null;
};

export async function canAccessMatchChat(user: ChatUser, match: MatchAccessSnapshot) {
    if (hasRole(user.role, ROLES.OFFICER)) {
        return true;
    }

    const participantUserIds = [match.playerA?.userId, match.playerB?.userId].filter(Boolean) as string[];
    if (participantUserIds.includes(user.id)) {
        return true;
    }

    const teamId = user.teamId ?? null;
    const teamRole = user.teamMembershipRole ?? null;
    if (teamId && teamRole && TEAM_CHAT_ROLES.includes(teamRole as (typeof TEAM_CHAT_ROLES)[number])) {
        if (teamId === match.playerA?.teamId || teamId === match.playerB?.teamId) {
            return true;
        }
    }

    return canRefereeTournament(user.id, match.tournamentId);
}

export const MATCH_CHAT_TEAM_ROLES = TEAM_CHAT_ROLES;
