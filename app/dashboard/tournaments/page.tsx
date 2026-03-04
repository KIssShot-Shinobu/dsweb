"use client";

import { useEffect, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";

const PER_PAGE = 10;

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

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all";
const labelCls = "block text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-1.5";
const btnPrimary = "px-4 py-2 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-semibold text-sm transition-all disabled:opacity-50";
const btnOutline = "px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all";
const btnDanger = "px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all";

const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
        case "ONGOING": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        case "COMPLETED": return "bg-gray-400/10 text-gray-400 border-gray-400/20";
        default: return "bg-blue-500/10 text-blue-400 border-blue-400/20";
    }
};

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<"ALL" | "UPCOMING" | "ONGOING" | "COMPLETED">("ALL");
    const [formData, setFormData] = useState({ title: "", gameType: "Duel Links", startDate: "", prizePool: 0, description: "", status: "UPCOMING", image: "" });
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTournaments = () => {
        fetch("/api/tournaments")
            .then((res) => res.json())
            .then((data) => { setTournaments(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchTournaments(); }, []);

    const handleImageUpload = async (file: File) => {
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (data.url) { setFormData((prev) => ({ ...prev, image: data.url })); setImagePreview(data.url); }
        } catch (e) { console.error(e); }
        finally { setUploading(false); }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) handleImageUpload(file); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };

    const removeImage = () => { setFormData((prev) => ({ ...prev, image: "" })); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(editingId ? `/api/tournaments/${editingId}` : "/api/tournaments", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, prizePool: Number(formData.prizePool) }),
            });
            if (res.ok) { fetchTournaments(); resetForm(); }
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); }
    };

    const handleEdit = (t: Tournament) => {
        setFormData({ title: t.title, gameType: t.gameType, startDate: t.startDate.split("T")[0], prizePool: t.prizePool, description: t.description || "", status: t.status, image: t.image || "" });
        setImagePreview(t.image || null);
        setEditingId(t.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this tournament?")) return;
        await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
        fetchTournaments();
    };

    const resetForm = () => { setFormData({ title: "", gameType: "Duel Links", startDate: "", prizePool: 0, description: "", status: "UPCOMING", image: "" }); setImagePreview(null); setEditingId(null); setShowForm(false); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const formatCurrency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

    return (
        <>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Tournaments</h1>
                    <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Manage guild tournaments</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowForm(true)}>+ New Tournament</button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 mb-5">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                            {editingId ? "Edit Tournament" : "Create New Tournament"}
                        </span>
                        <button className={btnOutline} onClick={resetForm}>Cancel</button>
                    </div>
                    <div className="p-4 md:p-5">
                        <form onSubmit={handleSubmit}>
                            {/* Image Upload */}
                            <div className="mb-5">
                                <label className={labelCls}>Tournament Banner / Poster</label>
                                {imagePreview ? (
                                    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-black">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                                        <button type="button" onClick={removeImage} className="absolute top-2.5 right-2.5 px-3 py-1 rounded-lg bg-black/70 text-white text-xs hover:bg-red-600/80 transition-colors">
                                            ✕ Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className={`border-2 border-dashed rounded-xl p-6 md:p-10 text-center cursor-pointer transition-all ${dragging ? "border-ds-amber bg-ds-amber/5" : "border-gray-200 dark:border-white/10 hover:border-ds-amber hover:bg-ds-amber/5 dark:hover:border-ds-amber/50"} ${uploading ? "opacity-60 pointer-events-none" : ""}`}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={() => setDragging(false)}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="text-3xl mb-2">{uploading ? "⏳" : "🖼️"}</div>
                                        <div className="text-sm font-medium text-gray-600 dark:text-white/50 mb-1">
                                            {uploading ? "Uploading..." : "Drag & drop image here, or click to browse"}
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-white/30">JPEG, PNG, WEBP, GIF — max 5MB</div>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
                            </div>

                            {/* Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className={labelCls}>Title *</label>
                                    <input type="text" className={inputCls} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="Tournament title" />
                                </div>
                                <div>
                                    <label className={labelCls}>Game Type *</label>
                                    <select className={inputCls} value={formData.gameType} onChange={(e) => setFormData({ ...formData, gameType: e.target.value })}>
                                        <option value="Duel Links">Duel Links</option>
                                        <option value="Master Duel">Master Duel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Start Date *</label>
                                    <input type="date" className={inputCls} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                                </div>
                                <div>
                                    <label className={labelCls}>Prize Pool (IDR)</label>
                                    <input type="number" className={inputCls} value={formData.prizePool} onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })} placeholder="0" />
                                </div>
                                <div>
                                    <label className={labelCls}>Status</label>
                                    <select className={inputCls} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="UPCOMING">Upcoming</option>
                                        <option value="ONGOING">Ongoing</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Description</label>
                                    <textarea className={inputCls} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={1} placeholder="Tournament description, rules, prizes..." />
                                </div>
                            </div>

                            <button type="submit" className={btnPrimary} disabled={submitting || uploading}>
                                {submitting ? "Saving..." : editingId ? "Update Tournament" : "Create Tournament"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 gap-3 flex-wrap">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                        All Tournaments ({statusFilter === "ALL" ? tournaments.length : tournaments.filter(t => t.status === statusFilter).length})
                    </span>
                    {/* Status filter */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                        {(["ALL", "UPCOMING", "ONGOING", "COMPLETED"] as const).map((s) => (
                            <button
                                key={s}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === s
                                    ? "bg-ds-amber text-black"
                                    : "text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5"
                                    }`}
                                onClick={() => { setStatusFilter(s); setPage(1); }}
                            >
                                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-5">
                    {(() => {
                        const filtered = statusFilter === "ALL" ? tournaments : tournaments.filter(t => t.status === statusFilter);
                        const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
                        const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
                        if (loading) return (
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}
                            </div>
                        );
                        if (filtered.length === 0) return (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">🏆</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No tournaments</div>
                                <p className="text-xs text-gray-400">
                                    {statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} tournaments` : "Create your first tournament"}
                                </p>
                            </div>
                        );
                        return (
                            <>
                                <div className="space-y-2">
                                    {paginated.map((t) => (
                                        <div key={t.id} className="flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
                                            {/* Thumbnail */}
                                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[#1a1a2e] flex items-center justify-center">
                                                {t.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={t.image} alt={t.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg">{t.gameType.includes("Master") ? "🎴" : "📱"}</span>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.title}</div>
                                                <div className="text-xs text-gray-400 dark:text-white/40">
                                                    {t.gameType} · {formatDate(t.startDate)} · {formatCurrency(t.prizePool)}
                                                </div>
                                            </div>
                                            {/* Status */}
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${getStatusBadge(t.status)}`}>
                                                {t.status}
                                            </span>
                                            {/* Actions */}
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button className={btnOutline} onClick={() => handleEdit(t)}>Edit</button>
                                                <button className={btnDanger} onClick={() => handleDelete(t.id)}>Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    total={filtered.length}
                                    perPage={PER_PAGE}
                                    onPage={setPage}
                                />
                            </>
                        );
                    })()}
                </div>
            </div>
        </>
    );
}
