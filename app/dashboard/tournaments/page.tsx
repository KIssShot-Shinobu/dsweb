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
                            className="btn btn-outline btn-sm"
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        placeholder="Tournament title"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Game Type *</label>
                                    <select
                                        className="form-select"
                                        value={formData.gameType}
                                        onChange={(e) => setFormData({ ...formData, gameType: e.target.value })}
                                    >
                                        <option value="Duel Links">Duel Links</option>
                                        <option value="Master Duel">Master Duel</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Start Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Prize Pool (IDR)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.prizePool}
                                        onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="UPCOMING">Upcoming</option>
                                        <option value="ONGOING">Ongoing</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        placeholder="Tournament description"
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
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
                                <div key={tournament.id} className="list-item">
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
                                    <div className="list-item-info">
                                        <div className="list-item-title">{tournament.title}</div>
                                        <div className="list-item-subtitle">
                                            {formatDate(tournament.startDate)} • {formatCurrency(tournament.prizePool)}
                                        </div>
                                    </div>
                                    <span className={`tournament-status ${getStatusClass(tournament.status)}`}>
                                        {tournament.status}
                                    </span>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => handleEdit(tournament)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(tournament.id)}
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
