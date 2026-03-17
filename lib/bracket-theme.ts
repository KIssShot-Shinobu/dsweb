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
    b1: "var(--color-base-100)",
    b2: "var(--color-base-200)",
    b3: "var(--color-base-300)",
    bc: "var(--color-base-content)",
    p: "var(--color-primary)",
    su: "var(--color-success)",
    er: "var(--color-error)",
};

export function readBracketPalette(): BracketPalette {
    return DEFAULT_PALETTE;
}

export function buildBracketTheme(palette: BracketPalette) {
    const mediumBorder = palette.b3;
    const subtleText = palette.bc;
    const disabledText = palette.bc;
    return createTheme({
        fontFamily: "inherit",
        textColor: {
            main: palette.bc,
            highlighted: palette.bc,
            dark: subtleText,
            disabled: disabledText,
        },
        matchBackground: {
            wonColor: palette.su,
            lostColor: palette.b2,
        },
        border: {
            color: mediumBorder,
            highlightedColor: palette.p,
        },
        score: {
            text: {
                highlightedWonColor: palette.su,
                highlightedLostColor: palette.er,
            },
            background: {
                wonColor: palette.su,
                lostColor: palette.b3,
            },
        },
        canvasBackground: palette.b1,
    });
}

export function buildBracketOptions(palette: BracketPalette) {
    return {
        style: {
            boxHeight: 96,
            canvasPadding: 28,
            spaceBetweenRows: 26,
            spaceBetweenColumns: 42,
            roundHeader: {
                isShown: true,
                height: 26,
                marginBottom: 10,
                fontSize: 12,
                fontColor: "#FFFFFF",
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
