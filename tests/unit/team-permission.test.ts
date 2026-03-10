import test from "node:test";
import assert from "node:assert/strict";
import {
    canAssignRole,
    canDeleteTeam,
    canEditTeamInfo,
    canInviteMembers,
    canLeaveTeam,
    canManageLineup,
    canPromoteMembers,
    canRemoveMember,
    canTransferCaptain,
} from "@/lib/permissions/team.permission";

test("captain has full management permissions", () => {
    assert.equal(canInviteMembers("CAPTAIN"), true);
    assert.equal(canEditTeamInfo("CAPTAIN"), true);
    assert.equal(canManageLineup("CAPTAIN"), true);
    assert.equal(canPromoteMembers("CAPTAIN"), true);
    assert.equal(canTransferCaptain("CAPTAIN"), true);
    assert.equal(canDeleteTeam("CAPTAIN"), true);
    assert.equal(canLeaveTeam("CAPTAIN"), false);
});

test("vice captain cannot remove captain and manager cannot remove members", () => {
    assert.equal(canRemoveMember("VICE_CAPTAIN", "CAPTAIN"), false);
    assert.equal(canRemoveMember("VICE_CAPTAIN", "PLAYER"), true);
    assert.equal(canRemoveMember("MANAGER", "PLAYER"), false);
    assert.equal(canDeleteTeam("VICE_CAPTAIN"), false);
    assert.equal(canDeleteTeam("MANAGER"), false);
});

test("only captain can assign elevated roles", () => {
    assert.equal(canAssignRole("CAPTAIN", "MANAGER", "PLAYER"), true);
    assert.equal(canAssignRole("CAPTAIN", "CAPTAIN", "PLAYER"), false);
    assert.equal(canAssignRole("VICE_CAPTAIN", "MANAGER", "PLAYER"), false);
});
