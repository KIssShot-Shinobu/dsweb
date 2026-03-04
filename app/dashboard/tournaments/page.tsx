"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Tournament {
    id: string;
    title: string;
    gameType: string;
    status: string;
    startDate: string;
    prizePool: number;
    description: string | null;
    image: string | null;
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
        image: "",
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageUpload = async (file: File) => {
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (data.url) {
                setFormData((prev) => ({ ...prev, image: data.url }));
                setImagePreview(data.url);
            }
        } catch (e) {
            console.error("Upload failed", e);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => setDragging(false);

    const removeImage = () => {
        setFormData((prev) => ({ ...prev, image: "" }));
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

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
            image: tournament.image || "",
        });
        setImagePreview(tournament.image || null);
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
            image: "",
        });
        setImagePreview(null);
        setEditingId(null);
        setShowForm(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const getStatusClass = (status: string) => {
        switch (status.toUpperCase()) {
            case "ONGOING": return "ongoing";
            case "COMPLETED": return "completed";
            default: return "upcoming";
        }
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric",
        });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(amount);

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
                        <button className="btn btn-outline btn-sm" onClick={resetForm}>
                            Cancel
                        </button>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            {/* Image Upload Zone */}
                            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                                <label className="form-label">Tournament Banner / Poster</label>

                                {imagePreview ? (
                                    <div className="tournament-image-preview">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imagePreview}
                                            alt="Tournament preview"
                                            className="tournament-preview-img"
                                        />
                                        <button
                                            type="button"
                                            className="tournament-image-remove"
                                            onClick={removeImage}
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className={`image-dropzone${dragging ? " dragging" : ""}${uploading ? " uploading" : ""}`}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="image-dropzone-icon">
                                            {uploading ? "⏳" : "🖼️"}
                                        </div>
                                        <div className="image-dropzone-text">
                                            {uploading
                                                ? "Uploading..."
                                                : "Drag & drop image here, or click to browse"}
                                        </div>
                                        <div className="image-dropzone-hint">
                                            JPEG, PNG, WEBP, GIF — max 5MB
                                        </div>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                            </div>

                            {/* Other Fields */}
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
                                        placeholder="Tournament description, rules, prizes..."
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
                                    {submitting ? "Saving..." : editingId ? "Update Tournament" : "Create Tournament"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tournament Cards Grid */}
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
                        <div className="tournament-cards-grid">
                            {tournaments.map((tournament) => (
                                <div key={tournament.id} className="tournament-card">
                                    {/* Banner Image */}
                                    <div className="tournament-card-banner">
                                        {tournament.image ? (
                                            <Image
                                                src={tournament.image}
                                                alt={tournament.title}
                                                fill
                                                className="tournament-card-img"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="tournament-card-placeholder">
                                                <span>{tournament.gameType.includes("Master") ? "🎴" : "📱"}</span>
                                            </div>
                                        )}
                                        <span className={`tournament-status ${getStatusClass(tournament.status)} tournament-card-status`}>
                                            {tournament.status}
                                        </span>
                                    </div>

                                    {/* Card Body */}
                                    <div className="tournament-card-body">
                                        <div className="tournament-card-game-type">
                                            {tournament.gameType}
                                        </div>
                                        <h3 className="tournament-card-title">{tournament.title}</h3>
                                        {tournament.description && (
                                            <p className="tournament-card-desc">{tournament.description}</p>
                                        )}
                                        <div className="tournament-card-meta">
                                            <span>📅 {formatDate(tournament.startDate)}</span>
                                            <span>💰 {formatCurrency(tournament.prizePool)}</span>
                                        </div>
                                        <div className="tournament-card-actions">
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
