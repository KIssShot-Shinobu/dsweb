import { createTheme } from "react-tournament-brackets";

export type BracketPalette = {
    b1: string;
    b2: string;
    b3: string;
    bc: string;
    p: string;
    su: string;
    er: string;
};

const DEFAULT_PALETTE: BracketPalette = {
    b1: "100% 0 0",
    b2: "98% 0 0",
    b3: "95% 0 0",
    bc: "21% 0.006 285.885",
    p: "45% 0.24 277.023",
    su: "76% 0.177 163.223",
    er: "71% 0.194 13.428",
};

const readCssVar = (name: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
};

const resolveColorValue = (value: string) => {
    const normalized = value.trim();
    if (typeof window === "undefined" || typeof document === "undefined") return normalized;
    const isColorString =
        normalized.startsWith("#") ||
        normalized.startsWith("rgb(") ||
        normalized.startsWith("rgba(") ||
        normalized.startsWith("hsl(") ||
        normalized.startsWith("hsla(") ||
        normalized.startsWith("oklch(");
    const inputColor = isColorString ? normalized : `oklch(${normalized})`;
    if (!document.body) return inputColor;

    const chip = document.createElement("span");
    chip.style.position = "absolute";
    chip.style.opacity = "0";
    chip.style.pointerEvents = "none";
    chip.style.color = inputColor;
    document.body.appendChild(chip);
    const resolved = getComputedStyle(chip).color;
    chip.remove();
    return resolved || inputColor;
};

const applyAlpha = (value: string, alpha?: number) => {
    if (alpha === undefined) return value;
    const normalized = value.trim();
    if (normalized.startsWith("rgba(")) return normalized;
    if (!normalized.startsWith("rgb(")) return normalized;
    const parts = normalized.replace("rgb(", "").replace(")", "").split(",").map((part) => part.trim());
    if (parts.length < 3) return normalized;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
};

export function readBracketPalette(): BracketPalette {
    return {
        b1: resolveColorValue(readCssVar("--color-base-100", DEFAULT_PALETTE.b1)),
        b2: resolveColorValue(readCssVar("--color-base-200", DEFAULT_PALETTE.b2)),
        b3: resolveColorValue(readCssVar("--color-base-300", DEFAULT_PALETTE.b3)),
        bc: resolveColorValue(readCssVar("--color-base-content", DEFAULT_PALETTE.bc)),
        p: resolveColorValue(readCssVar("--color-primary", DEFAULT_PALETTE.p)),
        su: resolveColorValue(readCssVar("--color-success", DEFAULT_PALETTE.su)),
        er: resolveColorValue(readCssVar("--color-error", DEFAULT_PALETTE.er)),
    };
}

export function buildBracketTheme(palette: BracketPalette) {
    return createTheme({
        fontFamily: "inherit",
        textColor: {
            main: palette.bc,
            highlighted: palette.bc,
            dark: applyAlpha(palette.bc, 0.7),
            disabled: applyAlpha(palette.bc, 0.45),
        },
        matchBackground: {
            wonColor: applyAlpha(palette.su, 0.18),
            lostColor: palette.b2,
        },
        border: {
            color: applyAlpha(palette.bc, 0.45),
            highlightedColor: palette.p,
        },
        score: {
            text: {
                highlightedWonColor: palette.su,
                highlightedLostColor: palette.er,
            },
            background: {
                wonColor: applyAlpha(palette.su, 0.22),
                lostColor: palette.b1,
            },
        },
        canvasBackground: palette.b1,
    });
}

export function buildBracketOptions(palette: BracketPalette) {
    return {
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
                fontColor: palette.bc,
                backgroundColor: palette.b2,
                fontFamily: "inherit",
            },
            connectorColor: palette.b3,
            connectorColorHighlight: palette.p,
        },
    };
}

export function buildBracketViewerColors(palette: BracketPalette) {
    return {
        background: palette.b2,
        svgBackground: palette.b1,
        miniatureBackground: palette.b2,
        miniatureSvgBackground: palette.b1,
    };
}

export { DEFAULT_PALETTE };
