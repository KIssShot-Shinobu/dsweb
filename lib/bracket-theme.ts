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

const readCssVar = (name: string, fallback: string, scope?: Element | null) => {
    if (typeof window === "undefined") return fallback;
    const targets: Element[] = [];
    if (scope) targets.push(scope);
    targets.push(document.documentElement);
    if (document.body) targets.push(document.body);
    for (const target of targets) {
        const value = getComputedStyle(target).getPropertyValue(name).trim();
        if (value) return value;
    }
    return fallback;
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

const readColorFromClass = (host: Element, className: string, property: "color" | "backgroundColor") => {
    const sample = document.createElement("span");
    sample.className = className;
    sample.style.position = "absolute";
    sample.style.opacity = "0";
    sample.style.pointerEvents = "none";
    sample.style.left = "-9999px";
    sample.style.top = "-9999px";
    host.appendChild(sample);
    const value = getComputedStyle(sample)[property];
    sample.remove();
    if (!value) return "";
    const normalized = value.trim();
    if (!normalized || normalized === "transparent" || normalized === "rgba(0, 0, 0, 0)") return "";
    return normalized;
};

const readPaletteFromClasses = (scope?: Element | null): BracketPalette | null => {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    const host = scope ?? document.body ?? document.documentElement;
    if (!host) return null;
    const b1 = readColorFromClass(host, "bg-base-100", "backgroundColor");
    const b2 = readColorFromClass(host, "bg-base-200", "backgroundColor");
    const b3 = readColorFromClass(host, "bg-base-300", "backgroundColor");
    const bc = readColorFromClass(host, "text-base-content", "color");
    const p = readColorFromClass(host, "bg-primary", "backgroundColor");
    const su = readColorFromClass(host, "bg-success", "backgroundColor");
    const er = readColorFromClass(host, "bg-error", "backgroundColor");

    if ([b1, b2, b3, bc, p, su, er].every(Boolean)) {
        return { b1, b2, b3, bc, p, su, er };
    }
    return null;
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

export function readBracketPalette(scope?: Element | null): BracketPalette {
    const classPalette = readPaletteFromClasses(scope);
    if (classPalette) return classPalette;
    return {
        b1: resolveColorValue(readCssVar("--color-base-100", DEFAULT_PALETTE.b1, scope)),
        b2: resolveColorValue(readCssVar("--color-base-200", DEFAULT_PALETTE.b2, scope)),
        b3: resolveColorValue(readCssVar("--color-base-300", DEFAULT_PALETTE.b3, scope)),
        bc: resolveColorValue(readCssVar("--color-base-content", DEFAULT_PALETTE.bc, scope)),
        p: resolveColorValue(readCssVar("--color-primary", DEFAULT_PALETTE.p, scope)),
        su: resolveColorValue(readCssVar("--color-success", DEFAULT_PALETTE.su, scope)),
        er: resolveColorValue(readCssVar("--color-error", DEFAULT_PALETTE.er, scope)),
    };
}

export function buildBracketTheme(palette: BracketPalette) {
    const mediumBorder = applyAlpha(palette.bc, 0.5);
    const subtleText = applyAlpha(palette.bc, 0.7);
    const disabledText = applyAlpha(palette.bc, 0.45);
    return createTheme({
        fontFamily: "inherit",
        textColor: {
            main: palette.bc,
            highlighted: palette.bc,
            dark: subtleText,
            disabled: disabledText,
        },
        matchBackground: {
            wonColor: applyAlpha(palette.su, 0.16),
            lostColor: applyAlpha(palette.b2, 0.85),
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
                wonColor: applyAlpha(palette.su, 0.2),
                lostColor: applyAlpha(palette.b3, 0.45),
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
                fontColor: palette.bc,
                backgroundColor: applyAlpha(palette.b2, 0.92),
                fontFamily: "inherit",
            },
            connectorColor: applyAlpha(palette.bc, 0.3),
            connectorColorHighlight: palette.p,
        },
    };
}

export function buildBracketViewerColors(palette: BracketPalette) {
    return {
        background: applyAlpha(palette.b2, 0.9),
        svgBackground: palette.b1,
        miniatureBackground: applyAlpha(palette.b2, 0.9),
        miniatureSvgBackground: palette.b1,
    };
}

export { DEFAULT_PALETTE };
