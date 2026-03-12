"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
    SingleEliminationBracket,
    DoubleEliminationBracket,
    Match,
    SVGViewer,
    createTheme,
    type MatchType,
} from "react-tournament-brackets";
import { StyleSheetManager } from "styled-components";

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

type ViewerSize = {
    width: number;
    height: number;
};

const bracketOptionsDark = {
    style: {
        boxHeight: 84,
        canvasPadding: 28,
        spaceBetweenRows: 24,
        spaceBetweenColumns: 42,
        roundHeader: {
            isShown: true,
            height: 26,
            marginBottom: 10,
            fontSize: 12,
            fontColor: "#FFFFFF",
            backgroundColor: "#1f2937",
            fontFamily: "inherit",
        },
        connectorColor: "#334155",
        connectorColorHighlight: "#facc15",
    },
};

const bracketOptionsLight = {
    style: {
        boxHeight: 84,
        canvasPadding: 28,
        spaceBetweenRows: 24,
        spaceBetweenColumns: 42,
        roundHeader: {
            isShown: true,
            height: 26,
            marginBottom: 10,
            fontSize: 12,
            fontColor: "#111827",
            backgroundColor: "#e2e8f0",
            fontFamily: "inherit",
        },
        connectorColor: "#94a3b8",
        connectorColorHighlight: "#f59e0b",
    },
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

export function TournamentBracket({
    tournamentId,
    structure,
}: {
    tournamentId: string;
    structure: "SINGLE_ELIM" | "DOUBLE_ELIM" | "SWISS";
}) {
    const [data, setData] = useState<BracketRound[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewerSize, setViewerSize] = useState<ViewerSize>({ width: 980, height: 520 });
    const [bracketTheme, setBracketTheme] = useState(() => createTheme({
        fontFamily: "inherit",
        textColor: {
            main: "#e2e8f0",
            highlighted: "#f8fafc",
            dark: "#cbd5f5",
            disabled: "rgba(148, 163, 184, 0.5)",
        },
        matchBackground: {
            wonColor: "rgba(34, 197, 94, 0.16)",
            lostColor: "rgba(15, 23, 42, 0.85)",
        },
        border: {
            color: "rgba(51, 65, 85, 0.8)",
            highlightedColor: "rgba(250, 204, 21, 0.8)",
        },
        score: {
            text: {
                highlightedWonColor: "#22c55e",
                highlightedLostColor: "#ef4444",
            },
            background: {
                wonColor: "rgba(34, 197, 94, 0.2)",
                lostColor: "rgba(51, 65, 85, 0.7)",
            },
        },
        canvasBackground: "rgba(15, 23, 42, 0.2)",
    }));
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(1);
    const [startAt, setStartAt] = useState<[number, number]>([0, 0]);
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        fetch(`/api/tournaments/${tournamentId}/bracket`)
            .then((res) => res.json())
            .then((payload: BracketResponse) => {
                if (!active) return;
                if (payload?.success) {
                    setData(payload.rounds || []);
                } else {
                    setError("Gagal memuat bracket.");
                }
            })
            .catch(() => {
                if (!active) return;
                setError("Gagal memuat bracket.");
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });
        return () => {
            active = false;
        };
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
        const updateTheme = () => {
            const isDark = root.getAttribute("data-theme") === "dark";
            setIsDarkTheme(isDark);
            setBracketTheme(
                isDark
                    ? createTheme({
                        fontFamily: "inherit",
                        textColor: {
                            main: "#e2e8f0",
                            highlighted: "#f8fafc",
                            dark: "#cbd5f5",
                            disabled: "rgba(148, 163, 184, 0.5)",
                        },
                        matchBackground: {
                            wonColor: "rgba(34, 197, 94, 0.16)",
                            lostColor: "rgba(15, 23, 42, 0.85)",
                        },
                        border: {
                            color: "rgba(51, 65, 85, 0.8)",
                            highlightedColor: "rgba(250, 204, 21, 0.8)",
                        },
                        score: {
                            text: {
                                highlightedWonColor: "#22c55e",
                                highlightedLostColor: "#ef4444",
                            },
                            background: {
                                wonColor: "rgba(34, 197, 94, 0.2)",
                                lostColor: "rgba(51, 65, 85, 0.7)",
                            },
                        },
                        canvasBackground: "rgba(15, 23, 42, 0.2)",
                    })
                    : createTheme({
                        fontFamily: "inherit",
                        textColor: {
                            main: "#1f2937",
                            highlighted: "#111827",
                            dark: "#334155",
                            disabled: "rgba(107, 114, 128, 0.5)",
                        },
                        matchBackground: {
                            wonColor: "rgba(34, 197, 94, 0.14)",
                            lostColor: "rgba(248, 250, 252, 0.9)",
                        },
                        border: {
                            color: "rgba(148, 163, 184, 0.5)",
                            highlightedColor: "rgba(250, 204, 21, 0.8)",
                        },
                        score: {
                            text: {
                                highlightedWonColor: "#15803d",
                                highlightedLostColor: "#b91c1c",
                            },
                            background: {
                                wonColor: "rgba(34, 197, 94, 0.15)",
                                lostColor: "rgba(226, 232, 240, 0.7)",
                            },
                        },
                        canvasBackground: "rgba(248, 250, 252, 0.8)",
                    })
            );
        };

        updateTheme();
        const observer = new MutationObserver(updateTheme);
        observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
        return () => observer.disconnect();
    }, []);

    const { singleMatches, upperMatches, lowerMatches } = useMemo(() => {
        const single: MatchType[] = [];
        const upper: MatchType[] = [];
        const lower: MatchType[] = [];

        data.forEach((round) => {
            const mapped = round.matches.map((match) => mapMatch(match, round.name));
            if (round.roundType === "LOWER") {
                lower.push(...mapped);
            } else {
                upper.push(...mapped);
            }
            single.push(...mapped);
        });

        return { singleMatches: single, upperMatches: upper, lowerMatches: lower };
    }, [data]);

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
            <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-6 text-sm text-base-content/60">
                Bracket belum dibuat.
            </div>
        );
    }

    if (structure === "SWISS") {
        return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                                <div key={match.id} className="rounded-box border border-base-300 bg-base-100/70 p-3">
                                    <div className="text-[11px] text-base-content/50">{match.name || "Match"}</div>
                                    <div className="mt-2 space-y-1 text-sm">
                                        {match.participants.map((participant, index) => (
                                            <div key={`${match.id}-${index}`} className="flex items-center justify-between text-base-content/70">
                                                <span className="font-semibold">{participant.name || "TBD"}</span>
                                                <span className="text-xs font-semibold">{participant.resultText || "-"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (isCompact) {
        return (
            <div className="space-y-4">
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
                                <div key={match.id} className="rounded-box border border-base-300 bg-base-100/70 p-3">
                                    <div className="text-[11px] text-base-content/50">{match.name || "Match"}</div>
                                    <div className="mt-2 space-y-1 text-sm">
                                        {match.participants.map((participant, index) => (
                                            <div key={`${match.id}-${index}`} className="flex items-center justify-between text-base-content/70">
                                                <span className="font-semibold">{participant.name || "TBD"}</span>
                                                <span className="text-xs font-semibold">{participant.resultText || "-"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const clampScale = (value: number) => Math.min(1.8, Math.max(0.6, value));
    const zoomIn = () => setScaleFactor((prev) => clampScale(prev + 0.15));
    const zoomOut = () => setScaleFactor((prev) => clampScale(prev - 0.15));
    const resetZoom = () => {
        setScaleFactor(1);
        setStartAt([0, 0]);
    };

    const renderBracket = (size: ViewerSize) => {
        const svgWrapper = ({ children, ...props }: { children: ReactElement }) => (
            <SVGViewer width={size.width} height={size.height} scaleFactor={scaleFactor} startAt={startAt} {...props}>
                {children}
            </SVGViewer>
        );

        if (structure === "DOUBLE_ELIM") {
            return (
                <StyleSheetManager shouldForwardProp={shouldForwardProp}>
                    <DoubleEliminationBracket
                        matches={{ upper: upperMatches, lower: lowerMatches }}
                        matchComponent={Match}
                        svgWrapper={svgWrapper}
                        theme={bracketTheme}
                        options={isDarkTheme ? bracketOptionsDark : bracketOptionsLight}
                    />
                </StyleSheetManager>
            );
        }

        return (
            <StyleSheetManager shouldForwardProp={shouldForwardProp}>
                <SingleEliminationBracket
                    matches={singleMatches}
                    matchComponent={Match}
                    svgWrapper={svgWrapper}
                    theme={bracketTheme}
                    options={isDarkTheme ? bracketOptionsDark : bracketOptionsLight}
                />
            </StyleSheetManager>
        );
    };

    return (
        <div ref={containerRef} className="mx-auto w-full max-w-[1200px] rounded-box border border-base-300 bg-base-200/40 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Bracket View</div>
                <div className="flex flex-wrap items-center gap-2">
                    <button className="btn btn-sm btn-ghost" onClick={zoomOut}>-</button>
                    <button className="btn btn-sm btn-ghost" onClick={resetZoom}>Reset</button>
                    <button className="btn btn-sm btn-ghost" onClick={zoomIn}>+</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setIsFullscreen(true)}>Fullscreen</button>
                </div>
            </div>
            {renderBracket(viewerSize)}

            {isFullscreen ? (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl bg-base-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">Bracket Fullscreen</h3>
                            <button className="btn btn-sm btn-ghost" onClick={() => setIsFullscreen(false)}>Close</button>
                        </div>
                        <div className="mt-4">
                            {renderBracket({
                                width: Math.min(1400, window.innerWidth - 80),
                                height: Math.min(760, window.innerHeight - 220),
                            })}
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setIsFullscreen(false)} />
                </div>
            ) : null}
        </div>
    );
}

export default TournamentBracket;
