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
    b1: "0 0% 100%",
    b2: "0 0% 97%",
    b3: "0 0% 90%",
    bc: "215 20% 12%",
    p: "230 96% 62%",
    su: "142 71% 45%",
    er: "0 75% 55%",
};

const readCssVar = (name: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
};

const toHsl = (value: string, alpha?: number) => {
    if (value.includes("hsl(")) return value;
    if (alpha !== undefined) {
        return `hsl(${value} / ${alpha})`;
    }
    return `hsl(${value})`;
};

export function readBracketPalette(): BracketPalette {
    return {
        b1: readCssVar("--b1", DEFAULT_PALETTE.b1),
        b2: readCssVar("--b2", DEFAULT_PALETTE.b2),
        b3: readCssVar("--b3", DEFAULT_PALETTE.b3),
        bc: readCssVar("--bc", DEFAULT_PALETTE.bc),
        p: readCssVar("--p", DEFAULT_PALETTE.p),
        su: readCssVar("--su", DEFAULT_PALETTE.su),
        er: readCssVar("--er", DEFAULT_PALETTE.er),
    };
}

export function buildBracketTheme(palette: BracketPalette) {
    return createTheme({
        fontFamily: "inherit",
        textColor: {
            main: toHsl(palette.bc),
            highlighted: toHsl(palette.bc),
            dark: toHsl(palette.bc, 0.7),
            disabled: toHsl(palette.bc, 0.45),
        },
        matchBackground: {
            wonColor: toHsl(palette.su, 0.18),
            lostColor: toHsl(palette.b2),
        },
        border: {
            color: toHsl(palette.bc, 0.35),
            highlightedColor: toHsl(palette.p),
        },
        score: {
            text: {
                highlightedWonColor: toHsl(palette.su),
                highlightedLostColor: toHsl(palette.er),
            },
            background: {
                wonColor: toHsl(palette.su, 0.22),
                lostColor: toHsl(palette.b1),
            },
        },
        canvasBackground: toHsl(palette.b1),
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
                fontColor: toHsl(palette.bc),
                backgroundColor: toHsl(palette.b2),
                fontFamily: "inherit",
            },
            connectorColor: toHsl(palette.b3),
            connectorColorHighlight: toHsl(palette.p),
        },
    };
}

export function buildBracketViewerColors(palette: BracketPalette) {
    return {
        background: toHsl(palette.b2),
        svgBackground: toHsl(palette.b1),
        miniatureBackground: toHsl(palette.b2),
        miniatureSvgBackground: toHsl(palette.b1),
    };
}

export { DEFAULT_PALETTE };
