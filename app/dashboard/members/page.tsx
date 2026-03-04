"use client";

import { useEffect, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";

interface Member {
    id: string;
    name: string;
    gameId: string;
    rank: string | null;
    role: string;
    joinedAt: string;
}

const PER_PAGE = 10;

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all";
const labelCls = "block text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-1.5";
const btnPrimary = "px-4 py-2 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-semibold text-sm transition-all disabled:opacity-50";
const btnOutline = "px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all";
const btnDanger = "px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all";

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
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: "", gameId: "", rank: "", role: "MEMBER" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const fetchMembers = () => {
        fetch("/api/members")
            .then((res) => res.json())
            .then((data) => { setMembers(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchMembers(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(editingId ? `/api/members/${editingId}` : "/api/members", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) { fetchMembers(); resetForm(); }
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); }
    };

    const handleEdit = (m: Member) => {
        setFormData({ name: m.name, gameId: m.gameId, rank: m.rank || "", role: m.role });
        setEditingId(m.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this member?")) return;
        await fetch(`/api/members/${id}`, { method: "DELETE" });
        fetchMembers();
    };

    const resetForm = () => { setFormData({ name: "", gameId: "", rank: "", role: "MEMBER" }); setEditingId(null); setShowForm(false); };
    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    // Filter + paginate
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
                    <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Manage guild members</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowForm(true)}>+ Add Member</button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 mb-5">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                            {editingId ? "Edit Member" : "Add New Member"}
                        </span>
                        <button className={btnOutline} onClick={resetForm}>Cancel</button>
                    </div>
                    <div className="p-4 md:p-5">
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className={labelCls}>Name *</label>
                                    <input type="text" className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Member name" />
                                </div>
                                <div>
                                    <label className={labelCls}>Game ID *</label>
                                    <input type="text" className={inputCls} value={formData.gameId} onChange={(e) => setFormData({ ...formData, gameId: e.target.value })} required placeholder="Duel Links / Master Duel ID" />
                                </div>
                                <div>
                                    <label className={labelCls}>Rank</label>
                                    <input type="text" className={inputCls} value={formData.rank} onChange={(e) => setFormData({ ...formData, rank: e.target.value })} placeholder="e.g., Legend, King of Games" />
                                </div>
                                <div>
                                    <label className={labelCls}>Role</label>
                                    <select className={inputCls} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="MEMBER">Member</option>
                                        <option value="OFFICER">Officer</option>
                                        <option value="LEADER">Leader</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className={btnPrimary} disabled={submitting}>
                                {submitting ? "Saving..." : editingId ? "Update Member" : "Add Member"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 border-b border-gray-100 dark:border-white/5 gap-3">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                        All Members ({filtered.length})
                    </span>
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search name or ID..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-white/70 placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber w-full sm:w-52 transition-all"
                    />
                </div>
                <div className="p-5">
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">👥</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{search ? "No results found" : "No members yet"}</div>
                            <p className="text-xs text-gray-400">{search ? "Try a different search term" : "Add your first guild member"}</p>
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
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            <button className={btnOutline} onClick={() => handleEdit(member)}>Edit</button>
                                            <button className={btnDanger} onClick={() => handleDelete(member.id)}>Del</button>
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
                    )}
                </div>
            </div>
        </>
    );
}
