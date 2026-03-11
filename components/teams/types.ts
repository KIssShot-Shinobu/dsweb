export type TeamUserSummary = {
    id: string;
    username: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    status: string;
};

export type TeamMemberSummary = {
    id: string;
    role: string;
    joinedAt: string;
    userId: string;
    user: TeamUserSummary;
};

export type TeamInviteSummary = {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    teamId: string;
    userId: string;
    invitedById: string;
    user: {
        id: string;
        username: string;
        fullName: string;
        email: string;
        avatarUrl: string | null;
    };
    invitedBy: {
        id: string;
        username: string;
        fullName: string;
    };
};

export type TeamJoinRequestSummary = {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    teamId: string;
    userId: string;
    user: {
        id: string;
        username: string;
        fullName: string;
        email: string;
        avatarUrl: string | null;
    };
};

export type TeamView = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    captain: TeamMemberSummary | null;
    viceCaptains: TeamMemberSummary[];
    managers: TeamMemberSummary[];
    coaches: TeamMemberSummary[];
    players: TeamMemberSummary[];
    members: TeamMemberSummary[];
    invites: TeamInviteSummary[];
    joinRequests: TeamJoinRequestSummary[];
    viewerMembership: TeamMemberSummary | null;
    viewerHasPendingInvite: boolean;
    viewerHasPendingJoin: boolean;
    permissions: {
        canInvite: boolean;
        canEditTeam: boolean;
        canManageLineup: boolean;
        canPromote: boolean;
        canTransferCaptain: boolean;
        canDelete: boolean;
        canLeave: boolean;
    };
};
