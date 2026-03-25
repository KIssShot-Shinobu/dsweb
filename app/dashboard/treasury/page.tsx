"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { RowActions } from "@/components/dashboard/row-actions";
import { btnOutline, btnPrimary, dashboardStackCls, inputCls, labelCls } from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import {
    TREASURY_CATEGORIES,
    TREASURY_METHODS,
    TREASURY_STATUS,
} from "@/lib/treasury-constants";
import { useLocale } from "@/hooks/use-locale";
import { formatCurrency as formatCurrencyIntl, formatDateTime, getIntlLocale } from "@/lib/i18n/format";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    category: string;
    method: string;
    status: string;
    counterparty: string | null;
    referenceCode: string | null;
    createdAt: string;
    userId: string | null;
    user: { fullName: string; username?: string | null } | null;
}

interface UserOption {
    id: string;
    fullName: string;
    role: string;
}

type MonthlyTotal = {
    label: string;
    income: number;
    expense: number;
};

type CategoryBreakdown = Record<string, { income: number; expense: number }>;

const PER_PAGE = 10;
const UNDO_DURATION = 5000;

export default function TreasuryPage() {
    const { locale, t } = useLocale();
    const currentYear = new Date().getFullYear();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        amount: 0,
        description: "",
        type: "MASUK",
        category: "OTHER",
        method: "OTHER",
        status: "CLEARED",
        counterparty: "",
        referenceCode: "",
        userId: "NONE",
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"ALL" | "MASUK" | "KELUAR">("ALL");
    const [month, setMonth] = useState("ALL");
    const [year, setYear] = useState("ALL");
    const [category, setCategory] = useState("ALL");
    const [method, setMethod] = useState("ALL");
    const [status, setStatus] = useState("ALL");
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<UserOption[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown>({});
    const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());

    const categoryLabels = t.dashboard.treasury.categoryLabels;
    const methodLabels = t.dashboard.treasury.methodLabels;
    const statusLabels = t.dashboard.treasury.statusLabels;

    const transactionTypeOptions = useMemo(
        () => [
            { value: "MASUK", label: t.dashboard.treasury.transactionTypes.income },
            { value: "KELUAR", label: t.dashboard.treasury.transactionTypes.expense },
        ],
        [t]
    );

    const filterOptions = useMemo(
        () => [
            { value: "ALL", label: t.dashboard.treasury.filters.all },
            { value: "MASUK", label: t.dashboard.treasury.transactionTypes.income },
            { value: "KELUAR", label: t.dashboard.treasury.transactionTypes.expense },
        ],
        [t]
    );

    const categoryOptions = useMemo(
        () => [
            { value: "ALL", label: t.dashboard.treasury.filters.allCategories },
            ...TREASURY_CATEGORIES.map((value) => ({
                value,
                label: categoryLabels[value] ?? value,
            })),
        ],
        [categoryLabels, t]
    );

    const methodOptions = useMemo(
        () => [
            { value: "ALL", label: t.dashboard.treasury.filters.allMethods },
            ...TREASURY_METHODS.map((value) => ({
                value,
                label: methodLabels[value] ?? value,
            })),
        ],
        [methodLabels, t]
    );

    const statusOptions = useMemo(
        () => [
            { value: "ALL", label: t.dashboard.treasury.filters.allStatus },
            ...TREASURY_STATUS.map((value) => ({
                value,
                label: statusLabels[value] ?? value,
            })),
        ],
        [statusLabels, t]
    );

    const { success, error } = useToast();
    const [confirmState, setConfirmState] = useState<{ open: boolean; id: string; label: string }>({ open: false, id: "", label: "" });
    const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const userSelectOptions = useMemo(
        () => [
            { value: "NONE", label: t.dashboard.treasury.labels.generalCashFull },
            ...users.map((user) => ({
                value: user.id,
                label: `${user.fullName} (${user.role})`,
            })),
        ],
        [t, users]
    );

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const fetchTreasury = useCallback(() => {
        setLoading(true);
        const summaryYearValue = year !== "ALL" ? year : String(new Date().getFullYear());
        const params = new URLSearchParams({
            month,
            year,
            page: String(page),
            limit: String(PER_PAGE),
            includeSummary: "1",
            summaryYear: summaryYearValue,
        });
        if (filter !== "ALL") {
            params.set("type", filter);
        }
        if (category !== "ALL") {
            params.set("category", category);
        }
        if (method !== "ALL") {
            params.set("method", method);
        }
        if (status !== "ALL") {
            params.set("status", status);
        }
        if (search.trim()) {
            params.set("search", search.trim());
        }

        fetch(`/api/treasury?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setTransactions(data.transactions || []);
                setBalance(data.balance || 0);
                setIncome(data.income || 0);
                setExpense(data.expense || 0);
                setTotal(data.total || 0);
                setMonthlyTotals(data.monthlyTotals || []);
                setCategoryBreakdown(data.categoryBreakdown || {});
                setSummaryYear(data.summaryYear || new Date().getFullYear());
            })
            .catch(() => {
                setTransactions([]);
                setBalance(0);
                setIncome(0);
                setExpense(0);
                setTotal(0);
                setMonthlyTotals([]);
                setCategoryBreakdown({});
            })
            .finally(() => setLoading(false));
    }, [category, filter, method, month, page, search, status, year]);

    const fetchUsers = useCallback(() => {
        setUsersLoading(true);
        fetch("/api/users?status=ACTIVE&role=ALL&perPage=100")
            .then((res) => res.json())
            .then((data) => {
                setUsers(data.data || []);
            })
            .catch(() => setUsers([]))
            .finally(() => setUsersLoading(false));
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchTreasury();
    }, [fetchTreasury]);

    useEffect(
        () => () => {
            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        },
        []
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(editingId ? `/api/treasury/${editingId}` : "/api/treasury", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: formData.type,
                    amount: Math.abs(Number(formData.amount)),
                    description: formData.description,
                    category: formData.category,
                    method: formData.method,
                    status: formData.status,
                    counterparty: formData.counterparty || null,
                    referenceCode: formData.referenceCode || null,
                    userId: formData.userId === "NONE" ? null : formData.userId,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                fetchTreasury();
                resetForm();
                success(editingId ? t.dashboard.treasury.toasts.updated : t.dashboard.treasury.toasts.created);
            } else {
                error(data?.message || data?.error || t.dashboard.treasury.toasts.saveFailed);
            }
        } catch {
            error(t.dashboard.treasury.toasts.networkError);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (tx: Transaction) => {
        setFormData({
            amount: Math.abs(tx.amount),
            description: tx.description,
            type: tx.amount >= 0 ? "MASUK" : "KELUAR",
            category: tx.category || "OTHER",
            method: tx.method || "OTHER",
            status: tx.status || "CLEARED",
            counterparty: tx.counterparty || "",
            referenceCode: tx.referenceCode || "",
            userId: tx.userId || "NONE",
        });
        setEditingId(tx.id);
        setShowModal(true);
    };

    const executePermanentDelete = async (id: string) => {
        setPendingDelete(null);
        try {
            const res = await fetch(`/api/treasury/${id}`, { method: "DELETE" });
            if (!res.ok) {
                error(t.dashboard.treasury.toasts.deleteFailed);
            }
        } catch {
            error(t.dashboard.treasury.toasts.deleteNetwork);
        } finally {
            fetchTreasury();
        }
    };

    const handleDeleteClick = (id: string, label: string) => {
        if (pendingDelete && deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            executePermanentDelete(pendingDelete.id);
        }
        setConfirmState({ open: true, id, label });
    };

    const handleConfirmDelete = () => {
        const { id, label } = confirmState;
        setConfirmState({ open: false, id: "", label: "" });
        setPendingDelete({ id, label });
        setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));

        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = setTimeout(() => executePermanentDelete(id), UNDO_DURATION);
    };

    const handleUndo = () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        setPendingDelete(null);
        fetchTreasury();
        success(t.dashboard.treasury.undo.cancelled);
    };

    const resetForm = () => {
        setFormData({
            amount: 0,
            description: "",
            type: "MASUK",
            category: "OTHER",
            method: "OTHER",
            status: "CLEARED",
            counterparty: "",
            referenceCode: "",
            userId: "NONE",
        });
        setEditingId(null);
        setShowModal(false);
    };

    const formatIdrInput = (value: number) => new Intl.NumberFormat(getIntlLocale(locale)).format(value);
    const parseIdrInput = (value: string) => {
        const numeric = Number(value.replace(/[^0-9]/g, ""));
        return Number.isNaN(numeric) ? 0 : numeric;
    };

    const formatCurrency = (amount: number) => formatCurrencyIntl(amount, locale, "IDR");

    const formatDate = (dateString: string) =>
        formatDateTime(dateString, locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const monthOptions = [
        { value: "ALL", label: t.dashboard.treasury.filters.allMonths },
        ...Array.from({ length: 12 }, (_, index) => {
            const value = index + 1;
            return {
                value: String(value),
                label: new Date(2000, value - 1).toLocaleString(getIntlLocale(locale), { month: "short" }),
            };
        }),
    ];

    const yearOptions = [
        { value: "ALL", label: t.dashboard.treasury.filters.allYears },
        ...[currentYear - 1, currentYear, currentYear + 1].map((value) => ({
            value: String(value),
            label: String(value),
        })),
    ];

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker={t.dashboard.treasury.kicker}
                    title={t.dashboard.treasury.title}
                    description={t.dashboard.treasury.description}
                    actions={<button className={btnPrimary} onClick={() => setShowModal(true)}>{t.dashboard.treasury.actions.addTransaction}</button>}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardMetricCard
                        label={t.dashboard.treasury.metrics.filteredBalance}
                        value={loading ? "..." : formatCurrency(balance)}
                        meta={month === "ALL" && year === "ALL" ? t.dashboard.treasury.metrics.filteredBalanceAllMeta : t.dashboard.treasury.metrics.filteredBalanceMeta}
                        tone="accent"
                    />
                    <DashboardMetricCard label={t.dashboard.treasury.metrics.income} value={loading ? "..." : formatCurrency(income)} meta={t.dashboard.treasury.metrics.incomeMeta} tone="success" />
                    <DashboardMetricCard label={t.dashboard.treasury.metrics.expense} value={loading ? "..." : formatCurrency(expense)} meta={t.dashboard.treasury.metrics.expenseMeta} tone="danger" />
                    <DashboardMetricCard label={t.dashboard.treasury.metrics.total} value={loading ? "..." : total} meta={t.dashboard.treasury.metrics.totalMeta} />
                </div>

                <DashboardPanel
                    title={t.dashboard.treasury.summary.title}
                    description={t.dashboard.treasury.summary.description(summaryYear)}
                >
                    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                        <AnalyticsChart data={monthlyTotals} loading={loading} title={t.dashboard.treasury.summary.chartTitle} />
                        <div className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-base-content">{t.dashboard.treasury.summary.categoryTitle}</div>
                                <div className="text-xs text-base-content/50">{t.dashboard.treasury.summary.netLabel}</div>
                            </div>
                            <div className="mt-4 space-y-3">
                                {Object.keys(categoryBreakdown).length === 0 ? (
                                    <div className="text-xs text-base-content/45">{t.dashboard.treasury.summary.emptyCategory}</div>
                                ) : (
                                    Object.entries(categoryBreakdown)
                                        .sort((a, b) => (b[1].income - b[1].expense) - (a[1].income - a[1].expense))
                                        .map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-base-content/70">
                                                {categoryLabels[key as keyof typeof categoryLabels] ?? key}
                                            </span>
                                            <span className="font-semibold text-base-content">
                                                {formatCurrency(value.income - value.expense)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    title={t.dashboard.treasury.list.title}
                    description={t.dashboard.treasury.list.description(total)}
                    action={(
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                            <input
                                type="text"
                                className="input input-bordered w-full sm:w-52"
                                placeholder={t.dashboard.treasury.list.searchPlaceholder}
                                value={search}
                                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                            />
                            <FormSelect value={month} onChange={(value) => { setMonth(value); setPage(1); }} options={monthOptions} className="w-full sm:w-32" />
                            <FormSelect value={year} onChange={(value) => { setYear(value); setPage(1); }} options={yearOptions} className="w-full sm:w-28" />
                            <FormSelect value={filter} onChange={(value) => { setFilter(value as "ALL" | "MASUK" | "KELUAR"); setPage(1); }} options={filterOptions} className="w-full sm:w-32" />
                            <FormSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={categoryOptions} className="w-full sm:w-40" />
                            <FormSelect value={method} onChange={(value) => { setMethod(value); setPage(1); }} options={methodOptions} className="w-full sm:w-36" />
                            <FormSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={statusOptions} className="w-full sm:w-32" />
                            <a
                                className={`${btnOutline} btn-sm`}
                                href={`/api/treasury/export?month=${month}&year=${year}&type=${filter !== "ALL" ? filter : ""}&category=${category !== "ALL" ? category : ""}&method=${method !== "ALL" ? method : ""}&status=${status !== "ALL" ? status : ""}&search=${encodeURIComponent(search.trim())}`}
                            >
                                {t.dashboard.treasury.actions.exportCsv}
                            </a>
                            <button
                                className={`${btnOutline} btn-sm`}
                                onClick={() => {
                                    setMonth("ALL");
                                    setYear("ALL");
                                    setFilter("ALL");
                                    setCategory("ALL");
                                    setMethod("ALL");
                                    setStatus("ALL");
                                    setSearch("");
                                    setPage(1);
                                }}
                            >
                                {t.dashboard.treasury.actions.reset}
                            </button>
                        </div>
                    )}
                >
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <DashboardEmptyState title={t.dashboard.treasury.list.emptyTitle} description={t.dashboard.treasury.list.emptyDescription} />
                    ) : (
                        <>
                            <div className="space-y-3">
                                {transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100 lg:flex-row lg:items-center">
                                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${transaction.amount >= 0 ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                                            {transaction.amount >= 0 ? "+" : "-"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="truncate text-sm font-semibold text-base-content">{transaction.description}</div>
                                                <span className="rounded-full border border-base-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-base-content/60">
                                                    {categoryLabels[transaction.category as keyof typeof categoryLabels] ?? transaction.category}
                                                </span>
                                                <span className={`badge badge-outline badge-xs ${transaction.status === "CLEARED" ? "badge-success" : transaction.status === "PENDING" ? "badge-warning" : "badge-ghost"}`}>
                                                    {statusLabels[transaction.status as keyof typeof statusLabels] ?? transaction.status}
                                                </span>
                                            </div>
                                            <div className="truncate text-xs text-base-content/45">
                                                {formatDate(transaction.createdAt)} - {transaction.user?.username || transaction.user?.fullName || t.dashboard.treasury.labels.generalCash}
                                            </div>
                                            {transaction.counterparty || transaction.referenceCode ? (
                                                <div className="truncate text-[11px] text-base-content/40">
                                                    {transaction.counterparty
                                                        ? `${t.dashboard.treasury.labels.counterparty}: ${transaction.counterparty}`
                                                        : `${t.dashboard.treasury.labels.counterparty}: -`}
                                                    {" · "}
                                                    {transaction.referenceCode
                                                        ? `${t.dashboard.treasury.labels.reference}: ${transaction.referenceCode}`
                                                        : `${t.dashboard.treasury.labels.reference}: -`}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className={`text-sm font-bold ${transaction.amount >= 0 ? "text-success" : "text-error"}`}>
                                            {transaction.amount >= 0 ? "+" : "-"}
                                            {formatCurrency(Math.abs(transaction.amount))}
                                        </div>
                                        <RowActions className="flex-shrink-0" onEdit={() => handleEdit(transaction)} onDelete={() => handleDeleteClick(transaction.id, transaction.description)} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5">
                                <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPage={setPage} />
                            </div>
                        </>
                    )}
                </DashboardPanel>
            </div>

            <Modal
                open={showModal}
                onClose={resetForm}
                title={editingId ? t.dashboard.treasury.form.titleEdit : t.dashboard.treasury.form.titleCreate}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.type}</label>
                        <FormSelect value={formData.type} onChange={(value) => setFormData((prev) => ({ ...prev, type: value }))} options={transactionTypeOptions} />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.category}</label>
                        <FormSelect value={formData.category} onChange={(value) => setFormData((prev) => ({ ...prev, category: value }))} options={categoryOptions.filter((option) => option.value !== "ALL")} />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.method}</label>
                        <FormSelect value={formData.method} onChange={(value) => setFormData((prev) => ({ ...prev, method: value }))} options={methodOptions.filter((option) => option.value !== "ALL")} />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.status}</label>
                        <FormSelect value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} options={statusOptions.filter((option) => option.value !== "ALL")} />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.user}</label>
                        <FormSelect value={formData.userId} onChange={(value) => setFormData((prev) => ({ ...prev, userId: value }))} options={userSelectOptions} disabled={usersLoading} />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.amount}</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            className={inputCls}
                            value={formData.amount ? formatIdrInput(formData.amount) : ""}
                            onChange={(event) => setFormData((prev) => ({ ...prev, amount: parseIdrInput(event.target.value) }))}
                            required
                            placeholder={t.dashboard.treasury.form.amountPlaceholder}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.description}</label>
                        <input
                            type="text"
                            className={inputCls}
                            value={formData.description}
                            onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                            required
                            placeholder={t.dashboard.treasury.form.descriptionPlaceholder}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.counterparty}</label>
                        <input
                            type="text"
                            className={inputCls}
                            value={formData.counterparty}
                            onChange={(event) => setFormData((prev) => ({ ...prev, counterparty: event.target.value }))}
                            placeholder={t.dashboard.treasury.form.counterpartyPlaceholder}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.treasury.form.reference}</label>
                        <input
                            type="text"
                            className={inputCls}
                            value={formData.referenceCode}
                            onChange={(event) => setFormData((prev) => ({ ...prev, referenceCode: event.target.value }))}
                            placeholder={t.dashboard.treasury.form.referencePlaceholder}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" className={btnOutline} onClick={resetForm}>{t.dashboard.treasury.form.cancel}</button>
                        <button type="submit" className={btnPrimary} disabled={submitting}>
                            {submitting ? t.dashboard.treasury.form.saving : editingId ? t.dashboard.treasury.form.update : t.dashboard.treasury.form.add}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                open={confirmState.open}
                title={t.dashboard.treasury.confirmDelete.title}
                message={t.dashboard.treasury.confirmDelete.message(confirmState.label)}
                confirmLabel={t.dashboard.treasury.confirmDelete.confirm}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmState({ open: false, id: "", label: "" })}
            />
            <UndoSnackbar open={!!pendingDelete} message={t.dashboard.treasury.undo.message(pendingDelete?.label ?? "")} duration={UNDO_DURATION} onUndo={handleUndo} />
        </DashboardPageShell>
    );
}
