"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { FormSelect } from "@/components/dashboard/form-select";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { btnDanger, btnOutline, btnPrimary, inputCls } from "@/components/dashboard/form-styles";
import { RowActions } from "@/components/dashboard/row-actions";

interface Tournament {
    id: string;
    title: string;
    description: string | null;
    gameType: "DUEL_LINKS" | "MASTER_DUEL";
    format: "BO1" | "BO3" | "BO5";
    status: "OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED";
    entryFee: number;
    prizePool: number;
    startDate: string;
    image?: string | null;
    _count?: { participants: number };
}

const UNDO_DURATION = 5000;
const selectOptions = {
    gameType: [
        { value: "DUEL_LINKS", label: "Duel Links" },
        { value: "MASTER_DUEL", label: "Master Duel" },
    ],
    format: [
        { value: "BO1", label: "Best of 1" },
        { value: "BO3", label: "Best of 3" },
        { value: "BO5", label: "Best of 5" },
    ],
    status: [
        { value: "OPEN", label: "OPEN" },
        { value: "ONGOING", label: "ONGOING" },
        { value: "COMPLETED", label: "COMPLETED" },
        { value: "CANCELLED", label: "CANCELLED" },
    ],
};

export default function AdminTournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { success, error } = useToast();
    const [confirmState, setConfirmState] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
    const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string; item: Tournament } | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        gameType: "DUEL_LINKS",
        format: "BO3",
        status: "OPEN",
        entryFee: 0,
        prizePool: 0,
        startDate: "",
        image: ""
    });

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            gameType: "DUEL_LINKS",
            format: "BO3",
            status: "OPEN",
            entryFee: 0,
            prizePool: 0,
            startDate: "",
            image: ""
        });
    };

    const toDateTimeLocal = (dateString: string) => {
        const date = new Date(dateString);
        const pad = (num: number) => String(num).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const fetchTournaments = () => {
        fetch("/api/tournaments")
            .then(res => res.json())
            .then(data => { setTournaments(data.tournaments || []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchTournaments(); }, []);
    useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/tournaments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                success("Turnamen berhasil dibuat!");
                setShowModal(false);
                resetForm();
                fetchTournaments();
            } else {
                error(data.message || "Gagal membuat turnamen");
            }
        } catch {
            error("Kesalahan jaringan");
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id: string, currentStatus: string) => {
        const statuses = ["OPEN", "ONGOING", "COMPLETED"];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextStatus = statuses[currentIndex + 1] || "COMPLETED";

        if (currentStatus === "COMPLETED") return;

        try {
            const res = await fetch(`/api/tournaments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                success(`Status dirubah ke ${nextStatus}`);
                fetchTournaments();
            } else {
                error("Gagal merubah status");
            }
        } catch {
            error("Network error");
        }
    };

    const openEditModal = (tournament: Tournament) => {
        setEditingTournamentId(tournament.id);
        setFormData({
            title: tournament.title,
            description: tournament.description || "",
            gameType: tournament.gameType,
            format: tournament.format,
            status: tournament.status,
            entryFee: tournament.entryFee,
            prizePool: tournament.prizePool,
            startDate: toDateTimeLocal(tournament.startDate),
            image: tournament.image || ""
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTournamentId) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/tournaments/${editingTournamentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                success("Turnamen berhasil diupdate!");
                setShowEditModal(false);
                setEditingTournamentId(null);
                resetForm();
                fetchTournaments();
            } else {
                error(data.message || "Gagal update turnamen");
            }
        } catch {
            error("Kesalahan jaringan");
        } finally {
            setSubmitting(false);
        }
    };

    const executePermanentDelete = async (id: string) => {
        setPendingDelete(null);
        try {
            const res = await fetch(`/api/tournaments/${id}`, {
                method: "DELETE"
            });
            const data = await res.json();

            if (res.ok) {
                fetchTournaments(); // sync with server
            } else {
                error(data.message || "Gagal menghapus turnamen");
                fetchTournaments();
            }
        } catch {
            error("Kesalahan jaringan");
            fetchTournaments();
        }
    };

    const handleDeleteClick = (id: string, title: string) => {
        if (pendingDelete && deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            executePermanentDelete(pendingDelete.id);
        }
        setConfirmState({ open: true, id, title });
    };

    const handleConfirmDelete = () => {
        const { id, title } = confirmState;
        const item = tournaments.find((t) => t.id === id);
        if (!item) return;

        setConfirmState({ open: false, id: "", title: "" });
        setTournaments((prev) => prev.filter((t) => t.id !== id));
        setPendingDelete({ id, title, item });

        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = setTimeout(() => executePermanentDelete(id), UNDO_DURATION);
    };

    const handleUndo = () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        if (pendingDelete) {
            setTournaments((prev) => {
                const restored = [pendingDelete.item, ...prev];
                return restored.sort(
                    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                );
            });
            success(`"${pendingDelete.title}" dipulihkan.`);
        }
        setPendingDelete(null);
    };

    const handleUploadImage = async (file: File) => {
        setUploadingImage(true);
        try {
            const body = new FormData();
            body.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body
            });
            const data = await res.json();

            if (res.ok && data?.url) {
                setFormData((prev) => ({ ...prev, image: data.url }));
                success("Gambar berhasil diupload");
            } else {
                error(data?.message || "Gagal upload gambar");
            }
        } catch {
            error("Kesalahan jaringan saat upload");
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Admin Tournaments</h1>
                    <p className="text-sm text-gray-400">Atur turnamen, peserta dan hadiah guild</p>
                </div>
                <button onClick={() => setShowModal(true)} className={btnPrimary}>
                    + Buat Turnamen
                </button>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/60">
                        <tr>
                            <th className="px-6 py-4">Turnamen</th>
                            <th className="px-6 py-4">Game & Format</th>
                            <th className="px-6 py-4">Status & Waktu</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tournaments.map(t => (
                            <tr key={t.id} className="border-b last:border-0 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
                                            {t.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={t.image} alt={t.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate">{t.title}</div>
                                            <div className="text-xs font-normal text-gray-400">Peserta: {t._count?.participants || 0}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-medium text-gray-700 dark:text-white/80">{t.gameType}</span>
                                    <span className="ml-2 text-xs bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500 dark:text-white/50">{t.format}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`text-xs font-bold ${t.status === 'OPEN' ? 'text-emerald-500' :
                                            t.status === 'ONGOING' ? 'text-amber-500' : 'text-gray-500'
                                        }`}>
                                        {t.status}
                                    </div>
                                    <div className="text-xs text-gray-400">{new Date(t.startDate).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <RowActions
                                        onEdit={() => openEditModal(t)}
                                        onDelete={() => handleDeleteClick(t.id, t.title)}
                                        extra={(
                                            <button
                                                onClick={() => updateStatus(t.id, t.status)}
                                                disabled={t.status === "COMPLETED"}
                                                className={`${btnOutline} disabled:opacity-30`}
                                            >
                                                Update Status &#8594;
                                            </button>
                                        )}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="Buat Turnamen Baru">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div><label className="text-xs mb-1 block">Judul Turnamen</label><input type="text" className={inputCls} required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs mb-1 block">Game</label>
                            <FormSelect
                                value={formData.gameType}
                                onChange={(value) => setFormData({ ...formData, gameType: value })}
                                options={selectOptions.gameType}
                            />
                        </div>
                        <div>
                            <label className="text-xs mb-1 block">Format</label>
                            <FormSelect
                                value={formData.format}
                                onChange={(value) => setFormData({ ...formData, format: value })}
                                options={selectOptions.format}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs mb-1 block">Entry Fee (Rp)</label><input type="number" className={inputCls} value={formData.entryFee} onChange={e => setFormData({ ...formData, entryFee: Number(e.target.value) })} min="0" /></div>
                        <div><label className="text-xs mb-1 block">Prize Pool (Rp)</label><input type="number" className={inputCls} value={formData.prizePool} onChange={e => setFormData({ ...formData, prizePool: Number(e.target.value) })} min="0" /></div>
                    </div>
                    <div>
                        <label className="text-xs mb-1 block">Upload Image</label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className={`${inputCls} file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-ds-amber/20 file:text-ds-amber file:font-semibold`}
                            onChange={async (e) => {
                                const inputEl = e.currentTarget;
                                const file = e.target.files?.[0];
                                if (!file) return;
                                await handleUploadImage(file);
                                inputEl.value = "";
                            }}
                            disabled={uploadingImage}
                        />
                        {uploadingImage && <p className="text-xs mt-1 text-gray-400">Mengupload gambar...</p>}
                    </div>
                    <div>
                        <label className="text-xs mb-1 block">Image URL</label>
                        <input
                            type="url"
                            className={inputCls}
                            placeholder="https://example.com/tournament.jpg"
                            value={formData.image}
                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                        />
                    </div>
                    {formData.image && (
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={formData.image} alt="Preview tournament" className="w-full h-40 object-cover rounded-lg" />
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, image: "" })}
                                className="mt-2 text-xs text-red-500 hover:text-red-600"
                            >
                                Hapus gambar
                            </button>
                        </div>
                    )}
                    <div><label className="text-xs mb-1 block">Tanggal & Waktu Mulai</label><input type="datetime-local" className={inputCls} required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
                    <button type="submit" disabled={submitting} className="w-full bg-ds-amber text-black font-bold py-3 text-sm rounded-xl">{submitting ? "Menyimpan..." : "Buat Turnamen"}</button>
                </form>
            </Modal>

            <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingTournamentId(null); resetForm(); }} title="Edit Turnamen">
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div><label className="text-xs mb-1 block">Judul Turnamen</label><input type="text" className={inputCls} required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                    <div><label className="text-xs mb-1 block">Deskripsi</label><textarea className={inputCls} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs mb-1 block">Game</label>
                            <FormSelect
                                value={formData.gameType}
                                onChange={(value) => setFormData({ ...formData, gameType: value })}
                                options={selectOptions.gameType}
                            />
                        </div>
                        <div>
                            <label className="text-xs mb-1 block">Format</label>
                            <FormSelect
                                value={formData.format}
                                onChange={(value) => setFormData({ ...formData, format: value })}
                                options={selectOptions.format}
                            />
                        </div>
                        <div>
                            <label className="text-xs mb-1 block">Status</label>
                            <FormSelect
                                value={formData.status}
                                onChange={(value) => setFormData({ ...formData, status: value })}
                                options={selectOptions.status}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs mb-1 block">Entry Fee (Rp)</label><input type="number" className={inputCls} value={formData.entryFee} onChange={e => setFormData({ ...formData, entryFee: Number(e.target.value) })} min="0" /></div>
                        <div><label className="text-xs mb-1 block">Prize Pool (Rp)</label><input type="number" className={inputCls} value={formData.prizePool} onChange={e => setFormData({ ...formData, prizePool: Number(e.target.value) })} min="0" /></div>
                    </div>
                    <div>
                        <label className="text-xs mb-1 block">Upload Image</label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className={`${inputCls} file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-ds-amber/20 file:text-ds-amber file:font-semibold`}
                            onChange={async (e) => {
                                const inputEl = e.currentTarget;
                                const file = e.target.files?.[0];
                                if (!file) return;
                                await handleUploadImage(file);
                                inputEl.value = "";
                            }}
                            disabled={uploadingImage}
                        />
                        {uploadingImage && <p className="text-xs mt-1 text-gray-400">Mengupload gambar...</p>}
                    </div>
                    <div>
                        <label className="text-xs mb-1 block">Image URL</label>
                        <input
                            type="url"
                            className={inputCls}
                            placeholder="https://example.com/tournament.jpg"
                            value={formData.image}
                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                        />
                    </div>
                    {formData.image && (
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={formData.image} alt="Preview tournament" className="w-full h-40 object-cover rounded-lg" />
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, image: "" })}
                                className="mt-2 text-xs text-red-500 hover:text-red-600"
                            >
                                Hapus gambar
                            </button>
                        </div>
                    )}
                    <div><label className="text-xs mb-1 block">Tanggal & Waktu Mulai</label><input type="datetime-local" className={inputCls} required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
                    <button type="submit" disabled={submitting} className="w-full bg-ds-amber text-black font-bold py-3 text-sm rounded-xl">{submitting ? "Menyimpan..." : "Simpan Perubahan"}</button>
                </form>
            </Modal>

            <ConfirmModal
                open={confirmState.open}
                title="Hapus Turnamen"
                message={`Hapus turnamen "${confirmState.title}"? Anda punya 5 detik untuk undo.`}
                confirmLabel="Hapus"
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmState({ open: false, id: "", title: "" })}
            />

            <UndoSnackbar
                open={!!pendingDelete}
                message={`"${pendingDelete?.title}" akan dihapus`}
                duration={UNDO_DURATION}
                onUndo={handleUndo}
            />
        </>
    );
}
