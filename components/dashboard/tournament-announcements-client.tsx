"use client";

import { useEffect, useState } from "react";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";

type Announcement = {
    id: string;
    title: string;
    content: string;
    pinned: boolean;
    createdAt: string;
    createdBy: {
        fullName: string;
    };
};

export function TournamentAnnouncementsClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [pinned, setPinned] = useState(false);
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/announcements`);
            const data = await res.json();
            if (res.ok) {
                setAnnouncements(data.announcements || []);
            } else {
                error(data.message || "Gagal memuat pengumuman.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, [tournamentId]);

    const handleSubmit = async () => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/announcements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, pinned }),
            });
            const data = await res.json();
            if (res.ok) {
                success("Pengumuman diposting.");
                setTitle("");
                setContent("");
                setPinned(false);
                loadAnnouncements();
            } else {
                error(data.message || "Gagal membuat pengumuman.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    const togglePin = async (announcement: Announcement) => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/announcements/${announcement.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pinned: !announcement.pinned }),
            });
            const data = await res.json();
            if (res.ok) {
                success(announcement.pinned ? "Pengumuman di-unpin." : "Pengumuman dipin.");
                loadAnnouncements();
            } else {
                error(data.message || "Gagal memperbarui pengumuman.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    const removeAnnouncement = async (announcementId: string) => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/announcements/${announcementId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) {
                success("Pengumuman dihapus.");
                loadAnnouncements();
            } else {
                error(data.message || "Gagal menghapus pengumuman.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Announcements"
                    title="Pengumuman Turnamen"
                    description="Kirim update penting kepada peserta secara cepat."
                    actions={
                        <button className={btnPrimary} onClick={handleSubmit} disabled={!title.trim() || !content.trim()}>
                            Publish Announcement
                        </button>
                    }
                />

                <DashboardPanel title="Buat Pengumuman" description="Markdown diperbolehkan. Fitur penyimpanan sedang disiapkan.">
                    <div className="space-y-3">
                        <label className={labelCls}>Pesan</label>
                        <input
                            className={inputCls}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Judul pengumuman"
                        />
                        <textarea
                            className={`${inputCls} min-h-[160px] resize-y`}
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="Contoh: Round 2 dimulai pukul 19.00 WIB."
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/55">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
                                Pin pengumuman
                            </label>
                            <span>Gunakan Markdown untuk format teks.</span>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Riwayat Pengumuman" description="Semua pengumuman akan tampil di sini.">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : announcements.length === 0 ? (
                        <DashboardEmptyState title="Belum ada pengumuman" description="Gunakan form di atas untuk membuat pengumuman pertama." />
                    ) : (
                        <div className="space-y-3">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-sm font-bold text-base-content">{announcement.title}</h4>
                                                {announcement.pinned ? <span className="badge badge-primary badge-xs">Pinned</span> : null}
                                            </div>
                                            <p className="mt-1 text-xs text-base-content/55">
                                                {announcement.createdBy?.fullName ?? "Admin"} · {new Date(announcement.createdAt).toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className={`${btnOutline} btn-xs`} onClick={() => togglePin(announcement)}>
                                                {announcement.pinned ? "Unpin" : "Pin"}
                                            </button>
                                            <button className="btn btn-error btn-outline btn-xs" onClick={() => removeAnnouncement(announcement.id)}>
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-sm text-base-content/70 whitespace-pre-line">{announcement.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
