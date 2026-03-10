import type { TeamRole } from "@prisma/client";

export const TEAM_ROLE_PRIORITY: Record<TeamRole, number> = {
    CAPTAIN: 5,
    VICE_CAPTAIN: 4,
    MANAGER: 3,
    COACH: 2,
    PLAYER: 1,
};

export function canInviteMembers(role: TeamRole) {
    return role === "CAPTAIN" || role === "VICE_CAPTAIN" || role === "MANAGER";
}

export function canEditTeamInfo(role: TeamRole) {
    return role === "CAPTAIN" || role === "VICE_CAPTAIN" || role === "MANAGER";
}

export function canManageLineup(role: TeamRole) {
    return role === "CAPTAIN" || role === "VICE_CAPTAIN" || role === "COACH";
}

export function canPromoteMembers(role: TeamRole) {
    return role === "CAPTAIN";
}

export function canTransferCaptain(role: TeamRole) {
    return role === "CAPTAIN";
}

export function canDeleteTeam(role: TeamRole) {
    return role === "CAPTAIN";
}

export function canLeaveTeam(role: TeamRole) {
    return role !== "CAPTAIN";
}

export function canRemoveMember(actorRole: TeamRole, targetRole: TeamRole) {
    if (actorRole === "CAPTAIN") {
        return targetRole !== "CAPTAIN";
    }

    if (actorRole === "VICE_CAPTAIN") {
        return targetRole !== "CAPTAIN";
    }

    return false;
}

export function canAssignRole(actorRole: TeamRole, nextRole: TeamRole, currentRole: TeamRole) {
    if (actorRole !== "CAPTAIN") {
        return false;
    }

    if (nextRole === "CAPTAIN") {
        return false;
    }

    return currentRole !== "CAPTAIN";
}
