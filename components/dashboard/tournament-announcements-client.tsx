"use client";

import { useEffect, useState } from "react";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";
import { formatDateTime } from "@/lib/i18n/format";

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
    const { locale, t } = useLocale();
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
                error(data.message || t.dashboard.announcements.errors.loadFailed);
            }
        } catch {
            error(t.dashboard.announcements.errors.network);
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
                success(t.dashboard.announcements.success.created);
                setTitle("");
                setContent("");
                setPinned(false);
                loadAnnouncements();
            } else {
                error(data.message || t.dashboard.announcements.errors.createFailed);
            }
        } catch {
            error(t.dashboard.announcements.errors.network);
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
                success(announcement.pinned ? t.dashboard.announcements.success.unpinned : t.dashboard.announcements.success.pinned);
                loadAnnouncements();
            } else {
                error(data.message || t.dashboard.announcements.errors.updateFailed);
            }
        } catch {
            error(t.dashboard.announcements.errors.network);
        }
    };

    const removeAnnouncement = async (announcementId: string) => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/announcements/${announcementId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.announcements.success.deleted);
                loadAnnouncements();
            } else {
                error(data.message || t.dashboard.announcements.errors.deleteFailed);
            }
        } catch {
            error(t.dashboard.announcements.errors.network);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.announcements.kicker}
                    title={t.dashboard.announcements.title}
                    description={t.dashboard.announcements.description}
                    actions={
                        <button className={btnPrimary} onClick={handleSubmit} disabled={!title.trim() || !content.trim()}>
                            {t.dashboard.announcements.publish}
                        </button>
                    }
                />

                <DashboardPanel title={t.dashboard.announcements.formTitle} description={t.dashboard.announcements.formDescription}>
                    <div className="space-y-3">
                        <label className={labelCls}>{t.dashboard.announcements.messageLabel}</label>
                        <input
                            className={inputCls}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder={t.dashboard.announcements.titlePlaceholder}
                        />
                        <textarea
                            className={`${inputCls} min-h-[160px] resize-y`}
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder={t.dashboard.announcements.contentPlaceholder}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/55">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
                                {t.dashboard.announcements.pinLabel}
                            </label>
                            <span>{t.dashboard.announcements.markdownHint}</span>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title={t.dashboard.announcements.historyTitle} description={t.dashboard.announcements.historyDescription}>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : announcements.length === 0 ? (
                        <DashboardEmptyState title={t.dashboard.announcements.emptyTitle} description={t.dashboard.announcements.emptyDescription} />
                    ) : (
                        <div className="space-y-3">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-sm font-bold text-base-content">{announcement.title}</h4>
                                                {announcement.pinned ? <span className="badge badge-primary badge-xs">{t.dashboard.announcements.pinnedBadge}</span> : null}
                                            </div>
                                            <p className="mt-1 text-xs text-base-content/55">
                                                {(announcement.createdBy?.fullName ?? t.dashboard.announcements.adminFallback)} · {formatDateTime(announcement.createdAt, locale)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className={`${btnOutline} btn-xs`} onClick={() => togglePin(announcement)}>
                                                {announcement.pinned ? t.dashboard.announcements.unpin : t.dashboard.announcements.pin}
                                            </button>
                                            <button className="btn btn-error btn-outline btn-xs" onClick={() => removeAnnouncement(announcement.id)}>
                                                {t.dashboard.announcements.remove}
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
