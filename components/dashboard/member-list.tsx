"use client";

import { useEffect, useState } from "react";

interface Member {
    id: string;
    name: string;
    gameId: string;
    rank: string | null;
    role: string;
    joinedAt: string;
}

export function MemberList() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/members")
            .then((res) => res.json())
            .then((data) => {
                setMembers(data.slice(0, 5));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleClass = (role: string) => {
        switch (role.toUpperCase()) {
            case "LEADER":
                return "leader";
            case "OFFICER":
                return "officer";
            default:
                return "member";
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Team Members</span>
                </div>
                <div className="card-body">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="member-item">
                            <div className="skeleton" style={{ width: 42, height: 42, borderRadius: "50%" }} />
                            <div style={{ flex: 1 }}>
                                <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 8 }} />
                                <div className="skeleton" style={{ width: "40%", height: 12 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Team Members</span>
                <a href="/dashboard/members" className="btn btn-outline" style={{ padding: "0.5rem 1rem", fontSize: "0.75rem" }}>
                    + Add Member
                </a>
            </div>
            <div className="card-body">
                {members.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">No members yet</div>
                        <p>Add your first guild member</p>
                    </div>
                ) : (
                    members.map((member) => (
                        <div key={member.id} className="member-item">
                            <div className="member-avatar">{getInitials(member.name)}</div>
                            <div className="member-info">
                                <div className="member-name">{member.name}</div>
                                <div className="member-role">ID: {member.gameId}</div>
                            </div>
                            <span className={`member-status ${getRoleClass(member.role)}`}>
                                {member.role}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
