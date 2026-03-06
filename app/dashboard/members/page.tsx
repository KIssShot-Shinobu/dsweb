"use client";

import { useEffect, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { btnDanger, btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { RowActions } from "@/components/dashboard/row-actions";

interface Member {
    id: string;
    name: string;
    gameId: string;
    rank: string | null;
    role: string;
    joinedAt: string;
}

const PER_PAGE = 10;
const UNDO_DURATION = 5000;

const roleOptions = [
    { value: "MEMBER", label: "Member" },
    { value: "OFFICER", label: "Officer" },
    { value: "LEADER", label: "Leader" },
];

const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
        case "LEADER": return "bg-ds-amber/20 text-ds-amber border-ds-amber/30";
        case "OFFICER": return "bg-purple-500/10 text-purple-400 border-purple-400/20";
        default: return "bg-blue-500/10 text-blue-400 border-blue-400/20";
    }
};

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: "", gameId: "", rank: "", role: "MEMBER" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const { success, error } = useToast();
    const [confirmState, setConfirmState] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; item: Member } | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchMembers = () => {
        fetch("/api/members")
            .then((res) => res.json())
            .then((data) => { setMembers(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchMembers(); }, []);

    // Cleanup timer on unmount
    useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(editingId ? `/api/members/${editingId}` : "/api/members", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                fetchMembers();
                resetForm();
                success(editingId ? "Member berhasil diperbarui." : "Member baru berhasil ditambahkan.");
            } else {
                error("Gagal menyimpan data member.");
            }
        } catch {
            error("Kesalahan jaringan. Coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (m: Member) => {
        setFormData({ name: m.name, gameId: m.gameId, rank: m.rank || "", role: m.role });
        setEditingId(m.id);
        setShowModal(true);
    };

    const handleDeleteClick = (id: string, name: string) => {
        // If another delete is already pending, commit it immediately
        if (pendingDelete && deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            executePermanentDelete(pendingDelete.id);
        }
        setConfirmState({ open: true, id, name });
    };

    const executePermanentDelete = async (id: string) => {
        setPendingDelete(null);
        try {
            const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
            if (!res.ok) { fetchMembers(); error("Gagal menghapus member."); }
        } catch { fetchMembers(); error("Kesalahan jaringan. Member dipulihkan."); }
    };

    const handleConfirmDelete = () => {
        const { id, name } = confirmState;
        const item = members.find((m) => m.id === id);
        if (!item) return;
        setConfirmState({ open: false, id: "", name: "" });

        // Optimistic: remove from UI immediately
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setPendingDelete({ id, name, item });

        // Start 5s timer then call DELETE
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = setTimeout(() => executePermanentDelete(id), UNDO_DURATION);
    };

    const handleUndo = () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        if (pendingDelete) {
            // Restore the item back to its original position
            setMembers((prev) => {
                const restored = [pendingDelete.item, ...prev];
                return restored.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
            });
            success(`"${pendingDelete.name}" dipulihkan.`);
        }
        setPendingDelete(null);
    };

    const resetForm = () => {
        setFormData({ name: "", gameId: "", rank: "", role: "MEMBER" });
        setEditingId(null);
        setShowModal(false);
    };

    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    const filtered = members.filter((m) =>
        !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.gameId.toLowerCase().includes(search.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const handleSearch = (val: string) => { setSearch(val); setPage(1); };

    return (
        <>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
                    <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Kelola member guild</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowModal(true)}>+ Tambah Member</button>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 border-b border-gray-100 dark:border-white/5 gap-3">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                        Daftar Member ({filtered.length})
                    </span>
                    <input
                        type="text"
                        placeholder="Cari nama atau ID..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-white/70 placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber w-full sm:w-52 transition-all"
                    />
                </div>
                <div className="p-4 md:p-5">
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">👥</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{search ? "Tidak ada hasil" : "Belum ada member"}</div>
                            <p className="text-xs text-gray-400">{search ? "Coba kata kunci lain" : "Tambahkan member pertama guild"}</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {paginated.map((member) => (
                                    <div key={member.id} className="flex items-center gap-3 p-3 md:p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
                                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-ds-amber flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                                            {getInitials(member.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.name}</div>
                                            <div className="text-xs text-gray-400 dark:text-white/40 truncate">
                                                ID: {member.gameId}{member.rank && ` · ${member.rank}`}
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border hidden sm:inline-flex ${getRoleBadge(member.role)}`}>
                                            {member.role}
                                        </span>
                                        <RowActions
                                            className="flex-shrink-0"
                                            onEdit={() => handleEdit(member)}
                                            onDelete={() => handleDeleteClick(member.id, member.name)}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
                        </>
                    )}
                </div>
            </div>

            {/* Form Modal */}
            <Modal open={showModal} onClose={resetForm} title={editingId ? "Edit Member" : "Tambah Member Baru"}>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className={labelCls}>Nama *</label>
                            <input type="text" className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Nama member" />
                        </div>
                        <div>
                            <label className={labelCls}>Game ID *</label>
                            <input type="text" className={inputCls} value={formData.gameId} onChange={(e) => setFormData({ ...formData, gameId: e.target.value })} required placeholder="Duel Links / Master Duel ID" />
                        </div>
                        <div>
                            <label className={labelCls}>Rank</label>
                            <input type="text" className={inputCls} value={formData.rank} onChange={(e) => setFormData({ ...formData, rank: e.target.value })} placeholder="Contoh: Legend, King of Games" />
                        </div>
                        <div>
                            <label className={labelCls}>Role</label>
                            <FormSelect
                                value={formData.role}
                                onChange={(value) => setFormData({ ...formData, role: value })}
                                options={roleOptions}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" className={btnOutline} onClick={resetForm}>Batal</button>
                        <button type="submit" className={btnPrimary} disabled={submitting}>
                            {submitting ? "Menyimpan..." : editingId ? "Update Member" : "Tambah Member"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={confirmState.open}
                title="Hapus Member"
                message={`Hapus "${confirmState.name}"? Anda punya 5 detik untuk undo.`}
                confirmLabel="Hapus"
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmState({ open: false, id: "", name: "" })}
            />

            {/* Undo Snackbar */}
            <UndoSnackbar
                open={!!pendingDelete}
                message={`"${pendingDelete?.name}" akan dihapus`}
                duration={UNDO_DURATION}
                onUndo={handleUndo}
            />
        </>
    );
}
