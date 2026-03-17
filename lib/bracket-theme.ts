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

const toColor = (value: string, alpha?: number) => {
    const normalized = value.trim();
    if (
        normalized.startsWith("#") ||
        normalized.startsWith("rgb(") ||
        normalized.startsWith("rgba(") ||
        normalized.startsWith("hsl(") ||
        normalized.startsWith("hsla(") ||
        normalized.startsWith("oklch(")
    ) {
        return normalized;
    }
    if (alpha !== undefined) {
        return `oklch(${normalized} / ${alpha})`;
    }
    return `oklch(${normalized})`;
};

export function readBracketPalette(): BracketPalette {
    return {
        b1: readCssVar("--color-base-100", DEFAULT_PALETTE.b1),
        b2: readCssVar("--color-base-200", DEFAULT_PALETTE.b2),
        b3: readCssVar("--color-base-300", DEFAULT_PALETTE.b3),
        bc: readCssVar("--color-base-content", DEFAULT_PALETTE.bc),
        p: readCssVar("--color-primary", DEFAULT_PALETTE.p),
        su: readCssVar("--color-success", DEFAULT_PALETTE.su),
        er: readCssVar("--color-error", DEFAULT_PALETTE.er),
    };
}

export function buildBracketTheme(palette: BracketPalette) {
    return createTheme({
        fontFamily: "inherit",
        textColor: {
            main: toColor(palette.bc),
            highlighted: toColor(palette.bc),
            dark: toColor(palette.bc, 0.7),
            disabled: toColor(palette.bc, 0.45),
        },
        matchBackground: {
            wonColor: toColor(palette.su, 0.18),
            lostColor: toColor(palette.b2),
        },
        border: {
            color: toColor(palette.bc, 0.45),
            highlightedColor: toColor(palette.p),
        },
        score: {
            text: {
                highlightedWonColor: toColor(palette.su),
                highlightedLostColor: toColor(palette.er),
            },
            background: {
                wonColor: toColor(palette.su, 0.22),
                lostColor: toColor(palette.b1),
            },
        },
        canvasBackground: toColor(palette.b1),
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
                fontColor: toColor(palette.bc),
                backgroundColor: toColor(palette.b2),
                fontFamily: "inherit",
            },
            connectorColor: toColor(palette.b3),
            connectorColorHighlight: toColor(palette.p),
        },
    };
}

export function buildBracketViewerColors(palette: BracketPalette) {
    return {
        background: toColor(palette.b2),
        svgBackground: toColor(palette.b1),
        miniatureBackground: toColor(palette.b2),
        miniatureSvgBackground: toColor(palette.b1),
    };
}

export { DEFAULT_PALETTE };
