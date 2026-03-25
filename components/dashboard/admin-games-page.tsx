"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { useToast } from "@/components/dashboard/toast";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useGames, type GameOption } from "@/hooks/use-games";
import { formatDate } from "@/lib/i18n/format";

type GameFormState = {
    code: string;
    name: string;
    type: string;
    isOnline: boolean;
};

const createEmptyForm = (): GameFormState => ({
    code: "",
    name: "",
    type: "",
    isOnline: true,
});

export default function AdminGamesPage() {
    const { t, locale } = useLocale();
    const { success, error } = useToast();
    const { games, loading, refresh } = useGames({ scope: "admin" });
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState<GameOption | null>(null);
    const [form, setForm] = useState<GameFormState>(createEmptyForm);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        if (editing) {
            setForm({
                code: editing.code,
                name: editing.name,
                type: editing.type ?? "",
                isOnline: Boolean(editing.isOnline),
            });
        } else {
            setForm(createEmptyForm());
        }
    }, [editing]);

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                code: form.code.trim(),
                name: form.name.trim(),
                type: form.type.trim(),
                isOnline: form.isOnline,
            };

            const res = await fetch(editing ? `/api/admin/games/${editing.id}` : "/api/admin/games", {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editing ? { name: payload.name, type: payload.type, isOnline: payload.isOnline } : payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || t.dashboard.games.errors.saveFailed);
            }

            success(editing ? t.dashboard.games.success.updated : t.dashboard.games.success.created);
            closeModal();
            refresh();
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.games.errors.saveFailed);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (game: GameOption) => {
        const nextValue = !game.isOnline;
        setSavingId(game.id);
        try {
            const res = await fetch(`/api/admin/games/${game.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isOnline: nextValue }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || t.dashboard.games.errors.toggleFailed);
            }
            success(nextValue ? t.dashboard.games.success.activated : t.dashboard.games.success.deactivated);
            refresh();
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.games.errors.toggleFailed);
        } finally {
            setSavingId(null);
        }
    };

    const statusBadge = (isOnline?: boolean) =>
        isOnline
            ? "border-success/20 bg-success/10 text-success"
            : "border-base-300 bg-base-200 text-base-content/60";

    const tableRows = useMemo(() => games, [games]);

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.games.kicker}
                    title={t.dashboard.games.title}
                    description={t.dashboard.games.description}
                    actions={
                        <button className={btnPrimary} onClick={() => setModalOpen(true)}>
                            {t.dashboard.games.actions.create}
                        </button>
                    }
                />

                <DashboardPanel
                    title={t.dashboard.games.panelTitle}
                    description={t.dashboard.games.panelDescription(tableRows.length)}
                >
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : tableRows.length === 0 ? (
                        <div className="space-y-4">
                            <DashboardEmptyState
                                title={t.dashboard.games.emptyTitle}
                                description={t.dashboard.games.emptyDescription}
                            />
                            <div className="flex justify-center">
                                <button className={btnPrimary} onClick={() => setModalOpen(true)}>
                                    {t.dashboard.games.actions.create}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tableRows.map((game) => (
                                <div
                                    key={game.id}
                                    className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-bold text-base-content">{game.name}</span>
                                            <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/60">
                                                {game.code}
                                            </span>
                                            {game.type ? (
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
                                                    {game.type}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-2 text-xs text-base-content/50">
                                            {t.dashboard.games.labels.createdAt(formatDate(game.createdAt ?? new Date(), locale, { day: "numeric", month: "short", year: "numeric" }))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusBadge(game.isOnline)}`}>
                                            {game.isOnline ? t.dashboard.games.status.active : t.dashboard.games.status.inactive}
                                        </span>
                                        <label className="flex items-center gap-2 text-xs text-base-content/60">
                                            <input
                                                type="checkbox"
                                                className="toggle toggle-primary toggle-sm"
                                                checked={Boolean(game.isOnline)}
                                                onChange={() => handleToggle(game)}
                                                disabled={savingId === game.id}
                                            />
                                            {t.dashboard.games.actions.toggle}
                                        </label>
                                        <button
                                            type="button"
                                            className={btnOutline}
                                            onClick={() => {
                                                setEditing(game);
                                                setModalOpen(true);
                                            }}
                                        >
                                            {t.dashboard.games.actions.edit}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>

            {modalOpen ? (
                <div className="modal modal-open">
                    <div className="modal-box max-w-lg">
                        <h3 className="text-lg font-bold">
                            {editing ? t.dashboard.games.modal.editTitle : t.dashboard.games.modal.createTitle}
                        </h3>
                        <p className="mt-2 text-sm text-base-content/60">{t.dashboard.games.modal.subtitle}</p>

                        <div className="mt-4 space-y-4">
                            {!editing ? (
                                <div>
                                    <label className={labelCls}>{t.dashboard.games.fields.code}</label>
                                    <input
                                        className={inputCls}
                                        value={form.code}
                                        onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                                        placeholder={t.dashboard.games.placeholders.code}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className={labelCls}>{t.dashboard.games.fields.code}</label>
                                    <div className="rounded-box border border-base-300 bg-base-200/60 px-3 py-2 text-sm font-semibold text-base-content/70">
                                        {form.code}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className={labelCls}>{t.dashboard.games.fields.name}</label>
                                <input
                                    className={inputCls}
                                    value={form.name}
                                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder={t.dashboard.games.placeholders.name}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.games.fields.type}</label>
                                <input
                                    className={inputCls}
                                    value={form.type}
                                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                                    placeholder={t.dashboard.games.placeholders.type}
                                />
                            </div>
                            <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                                {t.dashboard.games.fields.status}
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={form.isOnline}
                                    onChange={(event) => setForm((prev) => ({ ...prev, isOnline: event.target.checked }))}
                                />
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button className={btnOutline} onClick={closeModal}>
                                {t.common.cancel}
                            </button>
                            <button className={btnPrimary} onClick={handleSubmit} disabled={submitting}>
                                {submitting ? t.dashboard.games.actions.saving : t.dashboard.games.actions.save}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={closeModal} />
                </div>
            ) : null}
        </DashboardPageShell>
    );
}
