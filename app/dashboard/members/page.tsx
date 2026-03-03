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

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        gameId: "",
        rank: "",
        role: "MEMBER",
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchMembers = () => {
        fetch("/api/members")
            .then((res) => res.json())
            .then((data) => {
                setMembers(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const url = editingId ? `/api/members/${editingId}` : "/api/members";
        const method = editingId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchMembers();
                resetForm();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (member: Member) => {
        setFormData({
            name: member.name,
            gameId: member.gameId,
            rank: member.rank || "",
            role: member.role,
        });
        setEditingId(member.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this member?")) return;

        try {
            await fetch(`/api/members/${id}`, { method: "DELETE" });
            fetchMembers();
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", gameId: "", rank: "", role: "MEMBER" });
        setEditingId(null);
        setShowForm(false);
    };

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

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Members</h1>
                    <p className="page-subtitle">Manage guild members</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + Add Member
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <div className="card-header">
                        <span className="card-title">
                            {editingId ? "Edit Member" : "Add New Member"}
                        </span>
                        <button
                            className="btn btn-outline"
                            onClick={resetForm}
                            style={{ padding: "0.5rem 1rem" }}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                        placeholder="Member name"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Game ID *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.gameId}
                                        onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                        placeholder="Duel Links / Master Duel ID"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Rank
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.rank}
                                        onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                        placeholder="e.g., Legend, King of Games"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Role
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                            background: "white",
                                        }}
                                    >
                                        <option value="MEMBER">Member</option>
                                        <option value="OFFICER">Officer</option>
                                        <option value="LEADER">Leader</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: "1.5rem" }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? "Saving..." : editingId ? "Update Member" : "Add Member"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <span className="card-title">All Members ({members.length})</span>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div>Loading...</div>
                    ) : members.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <div className="empty-state-title">No members yet</div>
                            <p>Add your first guild member</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="member-item"
                                    style={{ padding: "1rem", background: "var(--dashboard-bg)", borderRadius: "10px", border: "none" }}
                                >
                                    <div className="member-avatar">{getInitials(member.name)}</div>
                                    <div className="member-info" style={{ flex: 1 }}>
                                        <div className="member-name">{member.name}</div>
                                        <div className="member-role">
                                            ID: {member.gameId} {member.rank && `• ${member.rank}`}
                                        </div>
                                    </div>
                                    <span className={`member-status ${getRoleClass(member.role)}`}>
                                        {member.role}
                                    </span>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handleEdit(member)}
                                        style={{ padding: "0.5rem 0.75rem", marginLeft: "0.5rem" }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handleDelete(member.id)}
                                        style={{ padding: "0.5rem 0.75rem", color: "var(--dashboard-error)" }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
