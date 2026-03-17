"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
    SingleEliminationBracket,
    DoubleEliminationBracket,
    Match,
    SVGViewer,
    type MatchType,
} from "react-tournament-brackets";
import { StyleSheetManager } from "styled-components";
import { useToast } from "@/components/dashboard/toast";
import { Modal } from "@/components/dashboard/modal";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import {
    buildBracketOptions,
    buildBracketTheme,
    buildBracketViewerColors,
    readBracketPalette,
    DEFAULT_PALETTE,
} from "@/lib/bracket-theme";

type BracketParticipant = {
    id?: string;
    name?: string;
    resultText?: string;
    isWinner?: boolean;
};

type BracketMatch = {
    id: string;
    name?: string;
    nextMatchId?: string | null;
    nextLooserMatchId?: string | null;
    tournamentRoundId: string;
    startTime?: string;
    state: string;
    status: string;
    scoreA?: number | null;
    scoreB?: number | null;
    playerAId?: string | null;
    playerBId?: string | null;
    winnerId?: string | null;
    participants: BracketParticipant[];
};

type BracketRound = {
    id: string;
    name: string;
    roundType: "MAIN" | "UPPER" | "LOWER" | "GRAND_FINAL" | "SWISS";
    roundNumber: number;
    matches: BracketMatch[];
};

type BracketResponse = {
    success: boolean;
    rounds: BracketRound[];
};

type SeedEntry = {
    seed: number;
    participant: {
        id: string;
        name: string;
    };
};

type ViewerSize = {
    width: number;
    height: number;
};

const shouldForwardProp = (prop: string) => !["won", "hovered", "highlighted"].includes(prop);

function mapMatch(match: BracketMatch, roundName: string): MatchType {
    return {
        id: match.id,
        name: match.name,
        nextMatchId: match.nextMatchId ?? null,
        nextLooserMatchId: match.nextLooserMatchId ?? undefined,
        tournamentRoundText: roundName,
        startTime: match.startTime ?? "",
        state: match.state ?? "SCHEDULED",
        participants: match.participants.map((participant, index) => ({
            id: participant.id ?? `${match.id}-${index}`,
            name: participant.name ?? "TBD",
            resultText: participant.resultText ?? "",
            isWinner: participant.isWinner ?? false,
            status: participant.id ? "PLAYED" : "NO_PARTY",
        })),
    };
}

function resolveWinnerId(match: BracketMatch) {
    if (match.winnerId) return match.winnerId;
    const [first, second] = match.participants;
    if (first?.isWinner && first.id) return String(first.id);
    if (second?.isWinner && second.id) return String(second.id);
    return match.playerAId ?? match.playerBId ?? "";
}

export function TournamentBracketAdmin({
    tournamentId,
    structure,
    status,
    onUpdated,
}: {
    tournamentId: string;
    structure: "SINGLE_ELIM" | "DOUBLE_ELIM" | "SWISS";
    status?: "OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED";
    onUpdated?: () => void;
}) {
    const [data, setData] = useState<BracketRound[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewerSize, setViewerSize] = useState<ViewerSize>({ width: 980, height: 520 });
    const [palette, setPalette] = useState(() =>
        typeof window === "undefined" ? DEFAULT_PALETTE : readBracketPalette()
    );
    const bracketTheme = useMemo(() => buildBracketTheme(palette), [palette]);
    const bracketOptions = useMemo(() => buildBracketOptions(palette), [palette]);
    const bracketViewerColors = useMemo(() => buildBracketViewerColors(palette), [palette]);
    const [isCompact, setIsCompact] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(1);
    const [startAt, setStartAt] = useState<[number, number]>([0, 0]);
    const [activeMatch, setActiveMatch] = useState<BracketMatch | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [seeds, setSeeds] = useState<SeedEntry[]>([]);
    const [seedsLoading, setSeedsLoading] = useState(false);
    const [unseededCount, setUnseededCount] = useState(0);
    const [showAllSeeds, setShowAllSeeds] = useState(false);
    const [shuffleConfirmOpen, setShuffleConfirmOpen] = useState(false);
    const [shuffling, setShuffling] = useState(false);
    const [formState, setFormState] = useState({
        scoreA: 0,
        scoreB: 0,
        winnerId: "",
        reason: "",
    });
    const { success, error: toastError } = useToast();
    const canShuffle = status === "OPEN";

    const fetchBracket = () => {
        setLoading(true);
        setError(null);
        fetch(`/api/tournaments/${tournamentId}/bracket`)
            .then((res) => res.json())
            .then((payload: BracketResponse) => {
                if (payload?.success) {
                    setData(payload.rounds || []);
                } else {
                    setError("Gagal memuat bracket.");
                }
            })
            .catch(() => {
                setError("Gagal memuat bracket.");
            })
            .finally(() => setLoading(false));
    };

    const fetchSeeds = () => {
        setSeedsLoading(true);
        fetch(`/api/tournaments/${tournamentId}/seeds`)
            .then((res) => res.json())
            .then((payload: { success: boolean; seeds?: SeedEntry[]; unseededCount?: number }) => {
                if (payload?.success) {
                    setSeeds(payload.seeds || []);
                    setUnseededCount(payload.unseededCount || 0);
                } else {
                    setSeeds([]);
                    setUnseededCount(0);
                }
            })
            .catch(() => {
                setSeeds([]);
                setUnseededCount(0);
            })
            .finally(() => setSeedsLoading(false));
    };

    useEffect(() => {
        fetchBracket();
    }, [tournamentId]);

    useEffect(() => {
        fetchSeeds();
    }, [tournamentId]);

    useEffect(() => {
        const updateSize = () => {
            if (!containerRef.current) return;
            const nextWidth = Math.max(320, containerRef.current.clientWidth);
            setViewerSize({
                width: nextWidth,
                height: Math.max(420, Math.round(nextWidth * 0.55)),
            });
            setIsCompact(nextWidth < 680);
        };

        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        let frame = requestAnimationFrame(() => {
            setPalette(readBracketPalette());
        });

        const handleThemeChange = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                setPalette(readBracketPalette());
            });
        };

        const observer = new MutationObserver(handleThemeChange);
        observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
        if (body) {
            observer.observe(body, { attributes: true, attributeFilter: ["data-theme"] });
        }

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, []);

    const { singleMatches, upperMatches, lowerMatches, matchIndex } = useMemo(() => {
        const single: MatchType[] = [];
        const upper: MatchType[] = [];
        const lower: MatchType[] = [];
        const index = new Map<string, BracketMatch>();

        data.forEach((round) => {
            const safeMatches = (round.matches || []).filter((match): match is BracketMatch => Boolean(match && match.id));
            safeMatches.forEach((match) => index.set(match.id, match));
            const mapped = safeMatches.map((match) => mapMatch(match, round.name));
            if (round.roundType === "LOWER") {
                lower.push(...mapped);
            } else {
                upper.push(...mapped);
            }
            single.push(...mapped);
        });

        if (upper.length === 0 && lower.length === 0) {
            return { singleMatches: single, upperMatches: upper, lowerMatches: lower, matchIndex: index };
        }

        const allIds = new Set([...upper, ...lower].map((match) => match.id));
        const sanitize = (matches: MatchType[]) =>
            matches.map((match) => ({
                ...match,
                nextMatchId: match.nextMatchId && allIds.has(match.nextMatchId) ? match.nextMatchId : null,
                nextLooserMatchId: match.nextLooserMatchId && allIds.has(match.nextLooserMatchId) ? match.nextLooserMatchId : undefined,
            }));

        return {
            singleMatches: single,
            upperMatches: sanitize(upper),
            lowerMatches: sanitize(lower),
            matchIndex: index,
        };
    }, [data]);

    const openMatchModal = (matchId: string | number) => {
        const match = matchIndex.get(String(matchId));
        if (!match) {
            toastError("Detail match tidak ditemukan.");
            return;
        }

        const defaultWinner = resolveWinnerId(match);
        setActiveMatch(match);
        setFormState({
            scoreA: match.scoreA ?? 0,
            scoreB: match.scoreB ?? 0,
            winnerId: defaultWinner,
            reason: "",
        });
        setModalOpen(true);
    };

    const handleSaveResult = async () => {
        if (!activeMatch) return;
        if (!activeMatch.playerAId || !activeMatch.playerBId) {
            toastError("Match belum lengkap. Tunggu kedua player terisi.");
            return;
        }
        if (!formState.winnerId) {
            toastError("Pilih pemenang terlebih dulu.");
            return;
        }

        try {
            const res = await fetch(`/api/matches/${activeMatch.id}/admin-resolve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scoreA: formState.scoreA,
                    scoreB: formState.scoreB,
                    winnerId: formState.winnerId,
                    reason: formState.reason || undefined,
                }),
            });
            const payload = await res.json();
            if (!res.ok) {
                toastError(payload?.message || "Gagal menyimpan hasil.");
                return;
            }
            success("Hasil match tersimpan.");
            setModalOpen(false);
            fetchBracket();
            onUpdated?.();
        } catch {
            toastError("Kesalahan jaringan.");
        }
    };

    const handleShuffle = async () => {
        setShuffling(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/shuffle`, { method: "POST" });
            const payload = await res.json();
            if (!res.ok) {
                toastError(payload?.message || "Gagal mengacak bracket.");
                return;
            }
            success(payload?.message || "Bracket diacak ulang.");
            fetchBracket();
            fetchSeeds();
            setShowAllSeeds(false);
            onUpdated?.();
        } catch {
            toastError("Kesalahan jaringan.");
        } finally {
            setShuffling(false);
            setShuffleConfirmOpen(false);
        }
    };

    const clampScale = (value: number) => Math.min(1.8, Math.max(0.6, value));
    const zoomIn = () => setScaleFactor((prev) => clampScale(prev + 0.15));
    const zoomOut = () => setScaleFactor((prev) => clampScale(prev - 0.15));
    const resetZoom = () => {
        setScaleFactor(1);
        setStartAt([0, 0]);
    };

    const canRenderDoubleElim = structure === "DOUBLE_ELIM" ? upperMatches.length > 0 && lowerMatches.length > 0 : true;
    const forceCompact = structure === "DOUBLE_ELIM" && !canRenderDoubleElim;

    const renderBracket = (size: ViewerSize) => {
        const svgWrapper = ({ children, ...props }: { children: ReactElement }) => (
            <SVGViewer
                width={size.width}
                height={size.height}
                scaleFactor={scaleFactor}
                startAt={startAt}
                background={bracketViewerColors.background}
                SVGBackground={bracketViewerColors.svgBackground}
                miniatureProps={{
                    position: "right",
                    background: bracketViewerColors.miniatureBackground,
                    SVGBackground: bracketViewerColors.miniatureSvgBackground,
                }}
                {...props}
            >
                {children}
            </SVGViewer>
        );

        const onMatchClick = ({ match }: { match: MatchType; topWon: boolean; bottomWon: boolean }) => openMatchModal(match.id);
        const safeUpperMatches = upperMatches.filter((match) => Boolean(match && match.id));
        const safeLowerMatches = lowerMatches.filter((match) => Boolean(match && match.id));
        const safeSingleMatches = singleMatches.filter((match) => Boolean(match && match.id));

        if (structure === "DOUBLE_ELIM") {
            return (
                <StyleSheetManager shouldForwardProp={shouldForwardProp}>
                    <DoubleEliminationBracket
                        matches={{ upper: safeUpperMatches, lower: safeLowerMatches }}
                        matchComponent={Match}
                        onMatchClick={onMatchClick}
                        svgWrapper={svgWrapper}
                        theme={bracketTheme}
                        options={bracketOptions}
                    />
                </StyleSheetManager>
            );
        }

        return (
            <StyleSheetManager shouldForwardProp={shouldForwardProp}>
                <SingleEliminationBracket
                    matches={safeSingleMatches}
                    matchComponent={Match}
                    onMatchClick={onMatchClick}
                    svgWrapper={svgWrapper}
                    theme={bracketTheme}
                    options={bracketOptions}
                />
            </StyleSheetManager>
        );
    };

    if (loading) {
        return (
            <div className="rounded-box border border-base-300 bg-base-200/40 p-6 text-sm text-base-content/60">
                Memuat bracket...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-box border border-error/30 bg-error/10 p-6 text-sm text-error">
                {error}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="space-y-4">
                <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-6 text-sm text-base-content/60">
                    <div>Bracket belum dibuat.</div>
                    {canShuffle ? (
                        <button
                            type="button"
                            className={`${btnOutline} btn-sm mt-4`}
                            onClick={() => setShuffleConfirmOpen(true)}
                            disabled={shuffling}
                        >
                            {shuffling ? "Membuat..." : "Generate Bracket"}
                        </button>
                    ) : (
                        <div className="mt-3 text-xs text-base-content/50">Generate hanya bisa saat turnamen masih OPEN.</div>
                    )}
                </div>
                <ConfirmModal
                    open={shuffleConfirmOpen}
                    title="Generate bracket?"
                    description="Bracket akan dibuat ulang dari peserta yang tersedia. Hanya bisa dilakukan saat turnamen masih OPEN."
                    confirmLabel="Generate"
                    onConfirm={handleShuffle}
                    onClose={() => setShuffleConfirmOpen(false)}
                />
            </div>
        );
    }

    if (structure === "SWISS" || isCompact || forceCompact) {
        const limit = 8;
        const visibleSeeds = showAllSeeds ? seeds : seeds.slice(0, limit);

        return (
            <div className="space-y-4">
                {forceCompact ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                        <div>Data double elimination belum lengkap. Menampilkan daftar match sementara.</div>
                        <button
                            type="button"
                            className={`${btnOutline} btn-xs`}
                            onClick={() => setShuffleConfirmOpen(true)}
                            disabled={!canShuffle}
                        >
                            Rebuild Bracket
                        </button>
                    </div>
                ) : null}
                {canShuffle ? (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className={`${btnOutline} btn-sm`}
                            onClick={() => setShuffleConfirmOpen(true)}
                            disabled={shuffling}
                        >
                            {shuffling ? "Mengacak..." : "Shuffle Bracket"}
                        </button>
                    </div>
                ) : null}
                <SeedOrderPanel
                    seeds={visibleSeeds}
                    hasMore={seeds.length > limit}
                    showAll={showAllSeeds}
                    onToggle={() => setShowAllSeeds((prev) => !prev)}
                    onRefresh={fetchSeeds}
                    loading={seedsLoading}
                    unseededCount={unseededCount}
                    compact
                />
                {data.map((round) => (
                    <div key={round.id} className="rounded-box border border-base-300 bg-base-200/40 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-xs font-bold uppercase tracking-[0.22em] text-base-content/60">
                                {round.name}
                            </div>
                            <span className="badge badge-outline text-[10px]">{round.matches.length} match</span>
                        </div>
                        <div className="space-y-3">
                            {round.matches.map((match) => (
                                <button
                                    key={match.id}
                                    type="button"
                                    onClick={() => openMatchModal(match.id)}
                                    className="w-full rounded-box border border-base-300 bg-base-100/70 p-3 text-left transition hover:border-primary/40"
                                >
                                    <div className="text-[11px] text-base-content/50">{match.name || "Match"}</div>
                                    <div className="mt-2 space-y-1 text-sm">
                                        {match.participants.map((participant, index) => (
                                            <div key={`${match.id}-${index}`} className="flex items-center justify-between text-base-content/70">
                                                <span className="font-semibold">{participant.name || "TBD"}</span>
                                                <span className="text-xs font-semibold">{participant.resultText || "-"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <MatchAdminModal
                    open={modalOpen}
                    match={activeMatch}
                    formState={formState}
                    setFormState={setFormState}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveResult}
                />
                <ConfirmModal
                    open={shuffleConfirmOpen}
                    title="Acak ulang bracket?"
                    description="Urutan peserta akan diacak ulang dan bracket dibuat ulang. Hanya bisa dilakukan saat turnamen masih OPEN."
                    confirmLabel="Shuffle"
                    onConfirm={handleShuffle}
                    onClose={() => setShuffleConfirmOpen(false)}
                />
            </div>
        );
    }

    const limit = 12;
    const visibleSeeds = showAllSeeds ? seeds : seeds.slice(0, limit);

    return (
        <div ref={containerRef} className="mx-auto w-full max-w-[1200px] rounded-box border border-base-300 bg-base-200/40 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Bracket Admin</div>
                <div className="flex flex-wrap items-center gap-2">
                    {canShuffle ? (
                        <button
                            type="button"
                            className={`${btnOutline} btn-sm`}
                            onClick={() => setShuffleConfirmOpen(true)}
                            disabled={shuffling}
                        >
                            {shuffling ? "Mengacak..." : "Shuffle Bracket"}
                        </button>
                    ) : null}
                    <button className="btn btn-sm btn-ghost" onClick={zoomOut}>-</button>
                    <button className="btn btn-sm btn-ghost" onClick={resetZoom}>Reset</button>
                    <button className="btn btn-sm btn-ghost" onClick={zoomIn}>+</button>
                </div>
            </div>
            <SeedOrderPanel
                seeds={visibleSeeds}
                hasMore={seeds.length > limit}
                showAll={showAllSeeds}
                onToggle={() => setShowAllSeeds((prev) => !prev)}
                onRefresh={fetchSeeds}
                loading={seedsLoading}
                unseededCount={unseededCount}
            />
            {renderBracket(viewerSize)}
            <MatchAdminModal
                open={modalOpen}
                match={activeMatch}
                formState={formState}
                setFormState={setFormState}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveResult}
            />
            <ConfirmModal
                open={shuffleConfirmOpen}
                title="Acak ulang bracket?"
                description="Urutan peserta akan diacak ulang dan bracket dibuat ulang. Hanya bisa dilakukan saat turnamen masih OPEN."
                confirmLabel="Shuffle"
                onConfirm={handleShuffle}
                onClose={() => setShuffleConfirmOpen(false)}
            />
        </div>
    );
}

function SeedOrderPanel({
    seeds,
    loading,
    unseededCount,
    hasMore,
    showAll,
    onToggle,
    onRefresh,
    compact = false,
}: {
    seeds: SeedEntry[];
    loading: boolean;
    unseededCount: number;
    hasMore: boolean;
    showAll: boolean;
    onToggle: () => void;
    onRefresh: () => void;
    compact?: boolean;
}) {
    const gridCls = compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

    return (
        <div className="mb-4 rounded-box border border-base-300 bg-base-100/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">Seed Order</div>
                    <p className="mt-1 text-xs text-base-content/50">Urutan seeding yang dipakai untuk bracket.</p>
                </div>
                <div className="flex items-center gap-2">
                    {unseededCount > 0 ? (
                        <span className="badge badge-ghost text-[10px]">Unseeded {unseededCount}</span>
                    ) : null}
                    <button type="button" className="btn btn-xs btn-ghost" onClick={onRefresh}>
                        Refresh
                    </button>
                </div>
            </div>
            <div className="mt-3">
                {loading ? (
                    <div className="text-xs text-base-content/50">Memuat seed...</div>
                ) : seeds.length === 0 ? (
                    <div className="text-xs text-base-content/50">Seed belum tersedia.</div>
                ) : (
                    <div className={`grid gap-2 ${gridCls}`}>
                        {seeds.map((entry) => (
                            <div key={entry.participant.id} className="flex items-center justify-between rounded-xl border border-base-300 bg-base-200/60 px-3 py-2 text-xs">
                                <span className="font-semibold text-base-content">#{entry.seed}</span>
                                <span className="truncate text-base-content/70">{entry.participant.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {hasMore ? (
                <button type="button" onClick={onToggle} className="btn btn-ghost btn-xs mt-3 w-full">
                    {showAll ? "Sembunyikan" : "Lihat semua seed"}
                </button>
            ) : null}
        </div>
    );
}

function MatchAdminModal({
    open,
    match,
    formState,
    setFormState,
    onClose,
    onSave,
}: {
    open: boolean;
    match: BracketMatch | null;
    formState: { scoreA: number; scoreB: number; winnerId: string; reason: string };
    setFormState: React.Dispatch<React.SetStateAction<{ scoreA: number; scoreB: number; winnerId: string; reason: string }>>;
    onClose: () => void;
    onSave: () => void;
}) {
    const playerA = match?.participants[0];
    const playerB = match?.participants[1];

    return (
        <Modal open={open} onClose={onClose} title={match ? `${match.name || "Match"} - Admin Result` : "Match Result"} size="md">
            <div className="space-y-4">
                <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-base-content">{playerA?.name || "TBD"}</span>
                        <span className="text-xs text-base-content/60">Player A</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold text-base-content">{playerB?.name || "TBD"}</span>
                        <span className="text-xs text-base-content/60">Player B</span>
                    </div>
                    <div className="mt-3 text-xs text-base-content/50">Status: {match?.status || "-"}</div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelCls}>Score A</label>
                        <input
                            type="number"
                            className={inputCls}
                            min={0}
                            max={5}
                            value={formState.scoreA}
                            onChange={(event) => setFormState((prev) => ({ ...prev, scoreA: Number(event.target.value) }))}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Score B</label>
                        <input
                            type="number"
                            className={inputCls}
                            min={0}
                            max={5}
                            value={formState.scoreB}
                            onChange={(event) => setFormState((prev) => ({ ...prev, scoreB: Number(event.target.value) }))}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Pemenang</label>
                    <select
                        className={inputCls}
                        value={formState.winnerId}
                        onChange={(event) => setFormState((prev) => ({ ...prev, winnerId: event.target.value }))}
                    >
                        <option value="">Pilih pemenang</option>
                        {match?.playerAId ? <option value={match.playerAId}>{playerA?.name || "Player A"}</option> : null}
                        {match?.playerBId ? <option value={match.playerBId}>{playerB?.name || "Player B"}</option> : null}
                    </select>
                </div>

                <div>
                    <label className={labelCls}>Catatan (opsional)</label>
                    <textarea
                        className={`${inputCls} min-h-[90px] resize-y`}
                        value={formState.reason}
                        onChange={(event) => setFormState((prev) => ({ ...prev, reason: event.target.value }))}
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button className="btn btn-ghost" onClick={onClose}>Batal</button>
                    <button className={btnPrimary} onClick={onSave}>Set Hasil</button>
                </div>
            </div>
        </Modal>
    );
}

export default TournamentBracketAdmin;
