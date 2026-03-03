"use client";

import { useEffect, useState } from "react";

interface Tournament {
    id: string;
    title: string;
    gameType: string;
    status: string;
    startDate: string;
    prizePool: number;
    description: string | null;
}

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        gameType: "Duel Links",
        startDate: "",
        prizePool: 0,
        description: "",
        status: "UPCOMING",
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchTournaments = () => {
        fetch("/api/tournaments")
            .then((res) => res.json())
            .then((data) => {
                setTournaments(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const url = editingId ? `/api/tournaments/${editingId}` : "/api/tournaments";
        const method = editingId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    prizePool: Number(formData.prizePool),
                }),
            });

            if (res.ok) {
                fetchTournaments();
                resetForm();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (tournament: Tournament) => {
        setFormData({
            title: tournament.title,
            gameType: tournament.gameType,
            startDate: tournament.startDate.split("T")[0],
            prizePool: tournament.prizePool,
            description: tournament.description || "",
            status: tournament.status,
        });
        setEditingId(tournament.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this tournament?")) return;

        try {
            await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
            fetchTournaments();
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            gameType: "Duel Links",
            startDate: "",
            prizePool: 0,
            description: "",
            status: "UPCOMING",
        });
        setEditingId(null);
        setShowForm(false);
    };

    const getStatusClass = (status: string) => {
        switch (status.toUpperCase()) {
            case "ONGOING":
                return "ongoing";
            case "COMPLETED":
                return "completed";
            default:
                return "upcoming";
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tournaments</h1>
                    <p className="page-subtitle">Manage guild tournaments</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + New Tournament
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <div className="card-header">
                        <span className="card-title">
                            {editingId ? "Edit Tournament" : "Create New Tournament"}
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
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                        placeholder="Tournament title"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Game Type *
                                    </label>
                                    <select
                                        value={formData.gameType}
                                        onChange={(e) => setFormData({ ...formData, gameType: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                            background: "white",
                                        }}
                                    >
                                        <option value="Duel Links">Duel Links</option>
                                        <option value="Master Duel">Master Duel</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Prize Pool (IDR)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.prizePool}
                                        onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                            background: "white",
                                        }}
                                    >
                                        <option value="UPCOMING">Upcoming</option>
                                        <option value="ONGOING">Ongoing</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                            resize: "vertical",
                                        }}
                                        placeholder="Tournament description"
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: "1.5rem" }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? "Saving..." : editingId ? "Update Tournament" : "Create Tournament"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <span className="card-title">All Tournaments ({tournaments.length})</span>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div>Loading...</div>
                    ) : tournaments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🏆</div>
                            <div className="empty-state-title">No tournaments yet</div>
                            <p>Create your first tournament</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                            {tournaments.map((tournament) => (
                                <div
                                    key={tournament.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "1rem",
                                        padding: "1rem",
                                        background: "var(--dashboard-bg)",
                                        borderRadius: "10px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 10,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "1.5rem",
                                            background: tournament.gameType.includes("Master")
                                                ? "rgba(168, 85, 247, 0.1)"
                                                : "rgba(59, 130, 246, 0.1)",
                                        }}
                                    >
                                        {tournament.gameType.includes("Master") ? "🎴" : "📱"}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: "var(--dashboard-text)", marginBottom: 4 }}>
                                            {tournament.title}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--dashboard-text-muted)" }}>
                                            {formatDate(tournament.startDate)} • {formatCurrency(tournament.prizePool)}
                                        </div>
                                    </div>
                                    <span className={`tournament-status ${getStatusClass(tournament.status)}`}>
                                        {tournament.status}
                                    </span>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handleEdit(tournament)}
                                        style={{ padding: "0.5rem 0.75rem" }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handleDelete(tournament.id)}
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
