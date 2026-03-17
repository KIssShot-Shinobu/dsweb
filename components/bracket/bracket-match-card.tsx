"use client";

import type { MatchComponentProps, ParticipantType } from "react-tournament-brackets";
import { cn } from "@/lib/utils";

const getPartyName = (party: ParticipantType, fallback: string) => party?.name || fallback;

const getPartyResult = (party: ParticipantType, resultFallback: (participant: ParticipantType) => string) => {
    if (party?.resultText) return party.resultText;
    const fallback = resultFallback(party);
    return fallback || "-";
};

export function BracketMatchCard({
    match,
    onMatchClick,
    onPartyClick,
    onMouseEnter,
    onMouseLeave,
    topParty,
    bottomParty,
    topWon,
    bottomWon,
    topHovered,
    bottomHovered,
    topText,
    bottomText,
    teamNameFallback,
    resultFallback,
}: MatchComponentProps) {
    const hasMatchAction = Boolean(match?.href) || typeof onMatchClick === "function";

    const handleMatchClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        if (!match?.href) {
            event.preventDefault();
        }
        if (typeof onMatchClick === "function") {
            onMatchClick({ match, topWon, bottomWon, event });
        }
    };

    const handlePartyClick = (party: ParticipantType, partyWon: boolean) => {
        if (!party?.id) return;
        onPartyClick?.(party, partyWon);
    };

    const renderParty = (party: ParticipantType, won: boolean, hovered: boolean) => {
        const name = getPartyName(party, teamNameFallback);
        const result = getPartyResult(party, resultFallback);
        const isClickable = Boolean(party?.id && onPartyClick);
        return (
            <button
                type="button"
                onClick={() => handlePartyClick(party, won)}
                onMouseEnter={() => party?.id && onMouseEnter(party.id)}
                onMouseLeave={onMouseLeave}
                disabled={!party?.id}
                className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[11px] font-semibold transition",
                    "border-base-300 bg-base-100 text-base-content",
                    "disabled:opacity-70",
                    won && "border-success/40 bg-success/15 text-success",
                    hovered && "ring-2 ring-primary/40",
                    isClickable && "hover:border-primary/50 hover:bg-base-200"
                )}
            >
                <span className="min-w-0 flex-1 truncate leading-none">{name}</span>
                <span
                    className={cn(
                        "min-w-[26px] text-right text-[10px] font-bold leading-none",
                        won ? "text-success" : "text-base-content/70"
                    )}
                >
                    {result}
                </span>
            </button>
        );
    };

    const hasTopRow = Boolean(topText || hasMatchAction);
    const hasBottomRow = Boolean(bottomText);

    return (
        <div
            className={cn(
                "flex h-full w-full flex-col rounded-lg border border-base-300/80 bg-base-100 p-2 text-[11px] text-base-content shadow-sm",
                hasTopRow || hasBottomRow ? "gap-2" : "justify-center gap-2"
            )}
        >
            {hasTopRow ? (
                <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-base-content/60">
                    <span className="truncate">{topText || ""}</span>
                    {hasMatchAction ? (
                        <a
                            href={match?.href || "#"}
                            className="text-[10px] font-semibold text-primary hover:underline"
                            onClick={handleMatchClick}
                        >
                            Match Details
                        </a>
                    ) : null}
                </div>
            ) : null}
            <div className={cn("flex flex-col gap-2", hasTopRow || hasBottomRow ? "" : "py-1")}>
                {renderParty(topParty, topWon, topHovered)}
                {renderParty(bottomParty, bottomWon, bottomHovered)}
            </div>
            {hasBottomRow ? (
                <div className="text-center text-[10px] font-semibold text-base-content/50">{bottomText}</div>
            ) : null}
        </div>
    );
}

export default BracketMatchCard;
