import namer from "color-namer";
import colorName from "color-name";

// Extract color-name map safely
const colorNameMap: Record<string, [number, number, number]> =
  (colorName as unknown as { default?: Record<string, [number, number, number]> }).default ||
  (colorName as Record<string, [number, number, number]>);

/**
 * Validates whether a string is a valid 3 or 6 hex code (with or without #)
 */
export function isValidHex(hex: string): boolean {
  if (!hex) return false;
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

/**
 * Normalizes hex to uppercase #RRGGBB format
 */
export function normalizeHex(hex: string): string {
  let clean = hex.trim();
  if (!clean.startsWith("#")) clean = `#${clean}`;
  if (clean.length === 4) {
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean.toUpperCase();
}

export type ColorCompileResult = {
  primaryName: string;
  hex: string;
  ntcName: string;
  pantoneName: string;
  basicName: string;
  htmlName: string;
  cssMatchName?: string;
  suggestions: { name: string; source: string }[];
};

/**
 * Capitalizes every word in a color name (e.g. "turkish rose" -> "Turkish Rose")
 */
function toTitleCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (m) => m.toUpperCase())
    .trim();
}

/**
 * Compiles any arbitrary hex code into readable fashion & CSS color names
 * using color-namer and color-name libraries.
 */
export function compileColorFromHex(inputHex: string): ColorCompileResult | null {
  if (!isValidHex(inputHex)) return null;
  const hex = normalizeHex(inputHex);

  try {
    const res = namer(hex);
    const ntc = res.ntc?.[0]?.name ? toTitleCase(res.ntc[0].name) : "";
    const pantone = res.pantone?.[0]?.name ? toTitleCase(res.pantone[0].name) : "";
    const html = res.html?.[0]?.name ? toTitleCase(res.html[0].name) : "";
    const basic = res.basic?.[0]?.name ? toTitleCase(res.basic[0].name) : "";

    // Check closest match from color-name css dictionary
    let closestCssName = "";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    let minCssDist = Infinity;
    for (const [name, [cr, cg, cb]] of Object.entries(colorNameMap)) {
      const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
      if (dist < minCssDist) {
        minCssDist = dist;
        closestCssName = toTitleCase(name);
      }
    }

    const suggestionsList: { name: string; source: string }[] = [];
    const seen = new Set<string>();

    const addSuggestion = (name: string, source: string) => {
      if (!name) return;
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        suggestionsList.push({ name, source });
      }
    };

    addSuggestion(ntc, "Fashion (NTC)");
    addSuggestion(pantone, "Pantone");
    addSuggestion(closestCssName, "CSS");
    addSuggestion(html, "HTML");
    addSuggestion(basic, "Basic");

    const primary = suggestionsList[0]?.name || hex;

    return {
      primaryName: primary,
      hex,
      ntcName: ntc,
      pantoneName: pantone,
      basicName: basic,
      htmlName: html,
      cssMatchName: closestCssName,
      suggestions: suggestionsList,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse lookup: Gets hex code from a standard color name using color-name
 */
export function getHexFromColorName(name: string): string | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase().replace(/[\s\-_]+/g, "");
  const rgb = colorNameMap[clean];
  if (!rgb) return null;
  return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1)}`.toUpperCase();
}

