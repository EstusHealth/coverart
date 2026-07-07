// Brand palettes, fonts, canvas sizes, text presets and templates for the
// Estus Social Creator. Colour values are either a hex string or
// { gradient: [stops] }. Layer colour fields hold either a palette name or a
// raw "#rrggbb" hex (custom colours pass through brand remapping untouched).

export const BRANDS = {
  "Estus": {
    accent: "#E87A2E",
    defaultBg: "Off-Black",
    colors: {
      "White": "#FFFFFF",
      "Estus Orange": "#E87A2E",
      "Noctua Brown": "#8B5A3C",
      "Light Grey": "#9CA3AF",
      "Mid Grey": "#6B7280",
      "Dark Grey": "#374151",
      "Off-Black": "#1A1A1A",
      "Pure Black": "#000000",
      "Cream": "#E8DDD0",
    },
    overlays: {
      "Black": "#000000",
      "Off-Black": "#1A1A1A",
      "Noctua Brown": "#8B5A3C",
      "Estus Orange": "#E87A2E",
    },
  },
  "Health": {
    accent: "#2AA2B4",
    defaultBg: "White",
    colors: {
      "White": "#FFFFFF",
      "Primary Navy": "#30487E",
      "Deep Navy": "#1E305A",
      "Teal": "#2AA2B4",
      "Magenta": "#A85A90",
      "Gradient Blue": "#629FB8",
      "Gradient Violet": "#686495",
      "Gradient Purple": "#6F528B",
      "Health Gradient": { gradient: ["#629FB8", "#686495", "#6F528B"] },
    },
    overlays: {
      "Black": "#000000",
      "Deep Navy": "#1E305A",
      "Primary Navy": "#30487E",
      "Teal": "#2AA2B4",
    },
  },
};

export const ALL_COLORS = { ...BRANDS["Estus"].colors, ...BRANDS["Health"].colors };
export const ALL_OVERLAYS = { ...BRANDS["Estus"].overlays, ...BRANDS["Health"].overlays };

// Colour-name translations INTO each brand, applied when switching brand and
// when instantiating the (Estus-named) presets/templates under another brand.
export const BRAND_REMAP = {
  "Health": {
    text: { "White": "Primary Navy", "Estus Orange": "Teal", "Noctua Brown": "Primary Navy", "Light Grey": "Deep Navy", "Mid Grey": "Deep Navy", "Dark Grey": "Deep Navy", "Off-Black": "Deep Navy", "Pure Black": "Deep Navy", "Cream": "Magenta" },
    bg: { "Off-Black": "White", "Pure Black": "Deep Navy", "Cream": "White", "Light Grey": "White", "Mid Grey": "Deep Navy", "Dark Grey": "Deep Navy", "Estus Orange": "Teal", "Noctua Brown": "Primary Navy" },
    overlay: { "Off-Black": "Deep Navy", "Noctua Brown": "Primary Navy", "Estus Orange": "Teal" },
  },
  "Estus": {
    text: { "Primary Navy": "White", "Deep Navy": "Light Grey", "Teal": "Estus Orange", "Magenta": "Cream", "Gradient Blue": "Light Grey", "Gradient Violet": "Mid Grey", "Gradient Purple": "Noctua Brown", "Health Gradient": "Estus Orange" },
    bg: { "White": "Off-Black", "Deep Navy": "Off-Black", "Primary Navy": "Off-Black", "Teal": "Estus Orange", "Magenta": "Noctua Brown", "Gradient Blue": "Off-Black", "Gradient Violet": "Off-Black", "Gradient Purple": "Off-Black", "Health Gradient": "Off-Black" },
    overlay: { "Deep Navy": "Off-Black", "Primary Navy": "Noctua Brown", "Teal": "Estus Orange" },
  },
};

const isHex = (c) => typeof c === "string" && c.startsWith("#");

// Resolve a colour field (palette name or raw hex) to a hex string or {gradient}.
export const colorValue = (name) => {
  if (isHex(name)) return name;
  return ALL_COLORS[name] || ALL_OVERLAYS[name] || "#FFFFFF";
};
export const isGradient = (name) => typeof colorValue(name) === "object";
export const solidColor = (name) => {
  const v = colorValue(name);
  return typeof v === "string" ? v : v.gradient[Math.floor(v.gradient.length / 2)];
};
export const cssBackground = (name, angle = 90) => {
  const v = colorValue(name);
  return typeof v === "string" ? v : `linear-gradient(${angle}deg, ${v.gradient.join(", ")})`;
};
export const canvasFill = (ctx, name, x0, y0, x1, y1) => {
  const v = colorValue(name);
  if (typeof v === "string") return v;
  const g = ctx.createLinearGradient(x0, y0, Math.max(x1, x0 + 1), y1);
  v.gradient.forEach((c, i) => g.addColorStop(i / (v.gradient.length - 1), c));
  return g;
};

// Remap a layer colour into the target brand (custom hex passes through).
export const remapColor = (color, targetBrand, kind = "text") => {
  if (isHex(color)) return color;
  const map = BRAND_REMAP[targetBrand]?.[kind] || {};
  return map[color] || color;
};

export const FONTS = {
  "Oswald": { css: "'Oswald', sans-serif", weights: [300, 400, 500, 600, 700] },
  "Libre Baskerville": { css: "'Libre Baskerville', serif", weights: [400, 700] },
  "Inter": { css: "'Inter', sans-serif", weights: [300, 400, 500, 600, 700] },
  "Archivo Black": { css: "'Archivo Black', sans-serif", weights: [400] },
  "Caveat": { css: "'Caveat', cursive", weights: [400, 600, 700] },
};
export const fontCss = (name) => (FONTS[name] || FONTS["Inter"]).css;
export const fontWeights = (name) => (FONTS[name] || FONTS["Inter"]).weights;

export const CANVAS_SIZES = {
  "IG Square (1080x1080)": { w: 1080, h: 1080 },
  "IG Portrait (1080x1350)": { w: 1080, h: 1350 },
  "IG Story (1080x1920)": { w: 1080, h: 1920 },
  "LinkedIn (1200x627)": { w: 1200, h: 627 },
  "X/Twitter (1200x675)": { w: 1200, h: 675 },
  "Facebook (1200x630)": { w: 1200, h: 630 },
  "YouTube Thumb (1280x720)": { w: 1280, h: 720 },
};

export const STRIKE_STYLES = ["straight", "double", "diagonal", "wavy", "scribble", "marker"];

export const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "soft-light", "darken", "lighten"];

// Text style presets (colours in Estus names; remapped when applied under Health).
export const BLOCK_PRESETS = {
  "Eyebrow": { font: "Oswald", size: 18, weight: 400, color: "Light Grey", letterSpacing: 8, uppercase: true, italic: false, align: "center", lineHeight: 1.2, strikethrough: false, strikeStyle: "straight" },
  "Hero Bold": { font: "Oswald", size: 96, weight: 700, color: "White", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 0.95, strikethrough: false, strikeStyle: "straight" },
  "Hero Accent": { font: "Oswald", size: 96, weight: 700, color: "Estus Orange", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 0.95, strikethrough: false, strikeStyle: "straight" },
  "Serif Subtitle": { font: "Libre Baskerville", size: 36, weight: 400, color: "Cream", letterSpacing: 0, uppercase: false, italic: true, align: "center", lineHeight: 1.3, strikethrough: false, strikeStyle: "straight" },
  "Body": { font: "Inter", size: 24, weight: 400, color: "Light Grey", letterSpacing: 0, uppercase: false, italic: false, align: "center", lineHeight: 1.5, strikethrough: false, strikeStyle: "straight" },
  "CTA Label": { font: "Oswald", size: 22, weight: 600, color: "White", letterSpacing: 4, uppercase: true, italic: false, align: "center", lineHeight: 1.2, strikethrough: false, strikeStyle: "straight" },
  "Checklist Item": { font: "Inter", size: 32, weight: 500, color: "Cream", letterSpacing: 0, uppercase: false, italic: false, align: "left", lineHeight: 1.4, strikethrough: false, strikeStyle: "straight" },
  "Handwritten": { font: "Caveat", size: 48, weight: 600, color: "Estus Orange", letterSpacing: 0, uppercase: false, italic: false, align: "center", lineHeight: 1.1, strikethrough: false, strikeStyle: "straight" },
};

export const PRESET_PLACEHOLDER = {
  "Eyebrow": "LABEL",
  "Hero Bold": "HEADLINE",
  "Hero Accent": "ACCENT",
  "Serif Subtitle": "Subtitle here.",
  "Body": "Body text here.",
  "CTA Label": "BUTTON TEXT",
  "Checklist Item": "Checklist item.",
  "Handwritten": "a little note",
};

// Templates are authored as vertical flow specs (the original stacked-block
// model) and converted to positioned text layers for the current canvas size
// at apply time. `preset` pulls from BLOCK_PRESETS; other keys override it.
export const TEMPLATES = {
  "hero-statement": {
    label: "Hero Statement",
    blocks: [
      { text: "OCCUPATIONAL THERAPY", preset: "Eyebrow", marginTop: 0 },
      { text: "BEING\nYOURSELF", preset: "Hero Bold", marginTop: 24 },
      { text: "ISN'T THE\nPROBLEM.", preset: "Hero Accent", marginTop: 0 },
      { text: "It's the starting point.", preset: "Serif Subtitle", marginTop: 24 },
      { text: "Neuroaffirming. Evidence-informed.\nEnvironment-focused.", preset: "Body", marginTop: 24 },
    ],
  },
  "quote-card": {
    label: "Quote Card",
    blocks: [
      { text: "ESTUS HEALTH", preset: "Eyebrow", marginTop: 0 },
      { text: "Your brain isn't broken.\nThe system wasn't\nbuilt for you.", preset: "Serif Subtitle", size: 44, marginTop: 40 },
      { text: "www.estushealth.com", preset: "Body", size: 18, color: "Mid Grey", marginTop: 48 },
    ],
  },
  "protocol-tip": {
    label: "Protocol Tip",
    blocks: [
      { text: "PERFORMANCE LAB: PROTOCOLS", preset: "Eyebrow", marginTop: 0 },
      { text: "PROTOCOL #12", preset: "Hero Bold", size: 64, marginTop: 24 },
      { text: "THE 2-MINUTE\nRULE", preset: "Hero Accent", size: 72, marginTop: 0 },
      { text: "If it takes less than 2 minutes,\ndo it now. Don't add it to the list.", preset: "Body", size: 22, color: "Cream", marginTop: 32 },
      { text: "performancelab@estushealth.com", preset: "Body", size: 16, color: "Mid Grey", marginTop: 40 },
    ],
  },
  "stat-callout": {
    label: "Stat Callout",
    blocks: [
      { text: "DID YOU KNOW?", preset: "Eyebrow", color: "Estus Orange", marginTop: 0 },
      { text: "70%", preset: "Hero Bold", size: 160, color: "White", marginTop: 16 },
      { text: "of late-diagnosed autistic adults\nreport burnout as their\nprimary presentation.", preset: "Body", size: 26, color: "Cream", marginTop: 8 },
      { text: "ESTUS HEALTH", preset: "Eyebrow", marginTop: 48 },
    ],
  },
  "therapy-goals": {
    label: "Therapy Goals",
    blocks: [
      { text: "OCCUPATIONAL THERAPY", preset: "Eyebrow", align: "left", marginTop: 0 },
      { text: "WHAT IS YOUR\nNEXT THERAPY\nGOAL?", preset: "Hero Bold", size: 72, align: "left", marginTop: 20 },
      { text: "Set a regular sleep schedule", preset: "Checklist Item", marginTop: 36, strikethrough: true, strikeStyle: "straight" },
      { text: "Build a sensory toolkit", preset: "Checklist Item", marginTop: 12, strikethrough: true, strikeStyle: "wavy" },
      { text: "Practice unmasking with safe people", preset: "Checklist Item", marginTop: 12 },
      { text: "Identify burnout triggers", preset: "Checklist Item", marginTop: 12 },
      { text: "Plan recovery time after socialising", preset: "Checklist Item", marginTop: 12 },
      { text: "Ask for accommodations at work", preset: "Checklist Item", marginTop: 12 },
      { text: "Schedule a self-care ritual weekly", preset: "Checklist Item", marginTop: 12 },
    ],
  },
};
