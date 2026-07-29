"use client";

import { useState, useRef, useCallback, useEffect, createContext, useContext } from "react";

const BRANDS = {
  "Estus": {
    accent: "#E87A2E",
    slug: "estus",
    defaultBg: "Off-Black",
    defaultText: "White",
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
    slug: "estus-health",
    defaultBg: "White",
    defaultText: "Primary Navy",
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
  // Block-game palette sampled from the source material: grass top, diamond,
  // the §6 gold of item names, redstone dust, oak planks, dirt, deepslate,
  // obsidian — plus a nether-portal gradient as the feature colour.
  "Minecraft": {
    accent: "#6CBB3C",
    slug: "estus-minecraft",
    defaultBg: "Obsidian",
    defaultText: "White",
    colors: {
      "White": "#FFFFFF",
      "Iron Grey": "#C6C6C6",
      "Stone Grey": "#8C8C8C",
      "Grass Green": "#6CBB3C",
      "Diamond": "#4AEDD9",
      "Gold": "#FFAA00",
      "Redstone": "#CE3B32",
      "Oak Tan": "#BC8F52",
      "Dirt Brown": "#7A5334",
      "Deepslate": "#4A4A4F",
      "Obsidian": "#14121F",
      "Nether Portal": { gradient: ["#C77DFF", "#8A2BE2", "#4B1580"] },
    },
    overlays: {
      "Black": "#000000",
      "Obsidian": "#14121F",
      "Deepslate": "#4A4A4F",
      "Dirt Brown": "#7A5334",
      "Nether Purple": "#4B1580",
    },
  },
};
const ALL_COLORS = Object.assign({}, ...Object.values(BRANDS).map((b) => b.colors));
const ALL_OVERLAYS = Object.assign({}, ...Object.values(BRANDS).map((b) => b.overlays));
// Colour-name translations INTO each brand, keyed by the foreign colour names
// they replace. Applied when switching brand and when instantiating the
// (Estus-named) presets/templates under another brand. Unmapped names fall
// back to the target brand's default, so a partial table is always safe.
const BRAND_REMAP = {
  "Health": {
    text: { "White": "Primary Navy", "Estus Orange": "Teal", "Noctua Brown": "Primary Navy", "Light Grey": "Deep Navy", "Mid Grey": "Deep Navy", "Dark Grey": "Deep Navy", "Off-Black": "Deep Navy", "Pure Black": "Deep Navy", "Cream": "Magenta", "Iron Grey": "Deep Navy", "Stone Grey": "Gradient Violet", "Grass Green": "Teal", "Diamond": "Teal", "Gold": "Magenta", "Redstone": "Magenta", "Oak Tan": "Primary Navy", "Dirt Brown": "Primary Navy", "Deepslate": "Deep Navy", "Obsidian": "Deep Navy", "Nether Portal": "Health Gradient" },
    bg: { "Off-Black": "White", "Pure Black": "Deep Navy", "Cream": "White", "Light Grey": "White", "Mid Grey": "Deep Navy", "Dark Grey": "Deep Navy", "Estus Orange": "Teal", "Noctua Brown": "Primary Navy", "Iron Grey": "White", "Stone Grey": "White", "Grass Green": "Teal", "Diamond": "Teal", "Gold": "Magenta", "Redstone": "Magenta", "Oak Tan": "White", "Dirt Brown": "Primary Navy", "Deepslate": "Deep Navy", "Obsidian": "Deep Navy", "Nether Portal": "Health Gradient" },
    overlay: { "Off-Black": "Deep Navy", "Noctua Brown": "Primary Navy", "Estus Orange": "Teal", "Obsidian": "Deep Navy", "Deepslate": "Deep Navy", "Dirt Brown": "Primary Navy", "Nether Purple": "Primary Navy" },
  },
  "Estus": {
    text: { "Primary Navy": "White", "Deep Navy": "Light Grey", "Teal": "Estus Orange", "Magenta": "Cream", "Gradient Blue": "Light Grey", "Gradient Violet": "Mid Grey", "Gradient Purple": "Noctua Brown", "Health Gradient": "Estus Orange", "Iron Grey": "Light Grey", "Stone Grey": "Mid Grey", "Grass Green": "Estus Orange", "Diamond": "Cream", "Gold": "Estus Orange", "Redstone": "Noctua Brown", "Oak Tan": "Noctua Brown", "Dirt Brown": "Noctua Brown", "Deepslate": "Dark Grey", "Obsidian": "Off-Black", "Nether Portal": "Estus Orange" },
    bg: { "White": "Off-Black", "Deep Navy": "Off-Black", "Primary Navy": "Off-Black", "Teal": "Estus Orange", "Magenta": "Noctua Brown", "Gradient Blue": "Off-Black", "Gradient Violet": "Off-Black", "Gradient Purple": "Off-Black", "Health Gradient": "Off-Black", "Iron Grey": "Cream", "Stone Grey": "Dark Grey", "Grass Green": "Estus Orange", "Diamond": "Cream", "Gold": "Estus Orange", "Redstone": "Noctua Brown", "Oak Tan": "Noctua Brown", "Dirt Brown": "Noctua Brown", "Deepslate": "Dark Grey", "Obsidian": "Off-Black", "Nether Portal": "Off-Black" },
    overlay: { "Deep Navy": "Off-Black", "Primary Navy": "Noctua Brown", "Teal": "Estus Orange", "Obsidian": "Off-Black", "Deepslate": "Off-Black", "Dirt Brown": "Noctua Brown", "Nether Purple": "Noctua Brown" },
  },
  "Minecraft": {
    text: { "Estus Orange": "Gold", "Noctua Brown": "Oak Tan", "Light Grey": "Iron Grey", "Mid Grey": "Stone Grey", "Dark Grey": "Deepslate", "Off-Black": "Obsidian", "Pure Black": "Obsidian", "Cream": "Oak Tan", "Primary Navy": "White", "Deep Navy": "Iron Grey", "Teal": "Diamond", "Magenta": "Redstone", "Gradient Blue": "Iron Grey", "Gradient Violet": "Stone Grey", "Gradient Purple": "Oak Tan", "Health Gradient": "Nether Portal" },
    bg: { "White": "Obsidian", "Off-Black": "Obsidian", "Pure Black": "Obsidian", "Cream": "Oak Tan", "Light Grey": "Stone Grey", "Mid Grey": "Deepslate", "Dark Grey": "Deepslate", "Estus Orange": "Gold", "Noctua Brown": "Dirt Brown", "Primary Navy": "Deepslate", "Deep Navy": "Obsidian", "Teal": "Diamond", "Magenta": "Redstone", "Gradient Blue": "Deepslate", "Gradient Violet": "Deepslate", "Gradient Purple": "Dirt Brown", "Health Gradient": "Nether Portal" },
    overlay: { "Off-Black": "Obsidian", "Deep Navy": "Obsidian", "Primary Navy": "Deepslate", "Noctua Brown": "Dirt Brown", "Estus Orange": "Dirt Brown", "Teal": "Nether Purple" },
  },
};
// Colour values are either a hex string or { gradient: [stops] }
const colorValue = (name) => ALL_COLORS[name] || "#FFFFFF";
const isGradient = (name) => typeof colorValue(name) === "object";
const solidColor = (name) => {
  const v = colorValue(name);
  return typeof v === "string" ? v : v.gradient[Math.floor(v.gradient.length / 2)];
};
const cssBackground = (name, angle = 90) => {
  const v = colorValue(name);
  return typeof v === "string" ? v : `linear-gradient(${angle}deg, ${v.gradient.join(", ")})`;
};
const canvasFill = (ctx, name, x0, y0, x1, y1) => {
  const v = colorValue(name);
  if (typeof v === "string") return v;
  const g = ctx.createLinearGradient(x0, y0, Math.max(x1, x0 + 1), y1);
  v.gradient.forEach((c, i) => g.addColorStop(i / (v.gradient.length - 1), c));
  return g;
};
// The game draws every string twice: once offset by one font-pixel in the
// text colour multiplied by 0.25, then the text itself on top.
const SHADOW_MIX = 0.25;
const shadowOffset = (fontSize) => Math.max(1, Math.round(fontSize / 8));
const shadowColorOf = (colorName) => {
  const hex = solidColor(colorName);
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.round(((n >> shift) & 255) * SHADOW_MIX);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};
const FONTS = {
  "Oswald": "'Oswald', sans-serif",
  "Libre Baskerville": "'Libre Baskerville', serif",
  "Inter": "'Inter', sans-serif",
  "Press Start 2P": "'Press Start 2P', monospace",
  "Silkscreen": "'Silkscreen', monospace",
  "VT323": "'VT323', monospace",
};
// Only weights that actually ship as a face — picking one that doesn't exist
// means the browser synthesises it, which the canvas export can't reproduce
// predictably.
const FONT_WEIGHTS = {
  "Oswald": [300, 400, 500, 600, 700],
  "Libre Baskerville": [400, 700],
  "Inter": [300, 400, 500, 600, 700],
  "Press Start 2P": [400],
  "Silkscreen": [400, 700],
  "VT323": [400],
};
const clampWeight = (font, weight) => {
  const list = FONT_WEIGHTS[font] || [400];
  return list.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), list[0]);
};
// Switching brand re-types the artwork as well as re-colouring it. Pixel faces
// set far more type per em, so sizes are rescaled and a minimum leading is
// enforced to stop the bitmap glyphs colliding. The rules are ordered and the
// first whose `minSize` the block clears wins: Press Start 2P is a display face
// and turns to mush at label sizes, so only display-sized Oswald becomes it —
// smaller Oswald picks up Silkscreen, which stays readable. That mirrors how
// the Minecraft preset pack itself is typed.
const TO_PIXEL_FONTS = {
  "Oswald": [
    { minSize: 40, font: "Press Start 2P", scale: 0.6, minLineHeight: 1.25 },
    { minSize: 0, font: "Silkscreen", scale: 1.1, minLineHeight: 1.2 },
  ],
  "Libre Baskerville": [{ minSize: 0, font: "Silkscreen", scale: 0.8, minLineHeight: 1.2 }],
  "Inter": [{ minSize: 0, font: "VT323", scale: 1.4, minLineHeight: 1.05 }],
};
const TO_PRINT_FONTS = {
  "Press Start 2P": [{ minSize: 0, font: "Oswald", scale: 1 / 0.6 }],
  "Silkscreen": [{ minSize: 0, font: "Libre Baskerville", scale: 1 / 0.8 }],
  "VT323": [{ minSize: 0, font: "Inter", scale: 1 / 1.4 }],
};
const FONT_REMAP = { "Minecraft": TO_PIXEL_FONTS, "Estus": TO_PRINT_FONTS, "Health": TO_PRINT_FONTS };
const fontSwapFor = (brand, font, size) => (FONT_REMAP[brand]?.[font] || []).find((rule) => size >= rule.minSize);
const CANVAS_SIZES = {
  "IG Square (1080x1080)": { w: 1080, h: 1080 },
  "IG Story (1080x1920)": { w: 1080, h: 1920 },
  "LinkedIn (1200x627)": { w: 1200, h: 627 },
  "X/Twitter (1200x675)": { w: 1200, h: 675 },
  "Facebook (1200x630)": { w: 1200, h: 630 },
  "YouTube Thumb (1280x720)": { w: 1280, h: 720 },
};
const STRIKE_STYLES = ["straight", "double", "diagonal", "wavy", "scribble", "marker"];

// ---------------------------------------------------------------------------
// Block textures
//
// Every texture is authored as a 16x16 texel tile — the source material's own
// resolution — and blown up with nearest-neighbour sampling so the pixels stay
// square at any size. Generation is seeded, so the tile the preview shows is
// byte-for-byte the tile the export draws.
// ---------------------------------------------------------------------------
const TEXEL = 16;
const TEXTURE_KINDS = ["none", "dirt", "grass", "stone", "cobble", "planks", "deepslate", "netherrack"];
const TEXTURE_LABELS = {
  none: "None", dirt: "Dirt", grass: "Grass", stone: "Stone",
  cobble: "Cobble", planks: "Planks", deepslate: "Deepslate", netherrack: "Netherrack",
};
const TEXTURE_SEEDS = { dirt: 1337, grass: 4242, stone: 8080, cobble: 5150, planks: 2718, deepslate: 9001, netherrack: 6660 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTextureCanvas(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXEL;
  canvas.height = TEXEL;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(TEXEL, TEXEL);
  const rnd = mulberry32(TEXTURE_SEEDS[kind] || 1);
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const put = (x, y, [r, g, b], m) => {
    const i = (y * TEXEL + x) * 4;
    img.data[i] = clamp(r * m);
    img.data[i + 1] = clamp(g * m);
    img.data[i + 2] = clamp(b * m);
    img.data[i + 3] = 255;
  };
  // Flat per-texel noise: tiles seamlessly because no texel depends on its
  // neighbours.
  const grain = (base, lo, hi, speckChance, speckMul) => {
    for (let y = 0; y < TEXEL; y++) {
      for (let x = 0; x < TEXEL; x++) {
        let m = lo + rnd() * (hi - lo);
        if (rnd() < speckChance) m *= speckMul;
        put(x, y, base, m);
      }
    }
  };

  if (kind === "dirt") {
    grain([134, 96, 67], 0.78, 1.14, 0.14, 0.72);
  } else if (kind === "grass") {
    grain([108, 187, 60], 0.82, 1.12, 0.12, 0.8);
  } else if (kind === "stone") {
    grain([126, 126, 126], 0.88, 1.08, 0.06, 0.86);
  } else if (kind === "netherrack") {
    grain([112, 54, 52], 0.72, 1.18, 0.13, 0.7);
  } else if (kind === "deepslate") {
    // Vertical banding on top of the grain gives deepslate its streaked look.
    const cols = Array.from({ length: TEXEL }, () => 0.86 + rnd() * 0.26);
    for (let y = 0; y < TEXEL; y++) {
      for (let x = 0; x < TEXEL; x++) {
        let m = cols[x] * (0.94 + rnd() * 0.12);
        if (rnd() < 0.06) m *= 0.8;
        put(x, y, [74, 74, 79], m);
      }
    }
  } else if (kind === "planks") {
    // Four horizontal planks, each with its own tone, a dark seam along the
    // top edge and one staggered butt-joint.
    for (let y = 0; y < TEXEL; y++) {
      const plank = Math.floor(y / 4);
      const rowM = 0.9 + ((plank * 7) % 5) * 0.045;
      const joint = (plank * 7 + 3) % TEXEL;
      for (let x = 0; x < TEXEL; x++) {
        let m = rowM * (0.95 + rnd() * 0.1);
        if (y % 4 === 0) m *= 0.72;
        if (x === joint) m *= 0.62;
        if (rnd() < 0.08) m *= 0.87;
        put(x, y, [188, 143, 82], m);
      }
    }
  } else if (kind === "cobble") {
    // Wrapped Voronoi cells read as stones; the ridge between the nearest two
    // cells becomes the mortar. Wrapping the distance keeps the tile seamless.
    const seeds = Array.from({ length: 6 }, () => ({ x: rnd() * TEXEL, y: rnd() * TEXEL, m: 0.82 + rnd() * 0.3 }));
    for (let y = 0; y < TEXEL; y++) {
      for (let x = 0; x < TEXEL; x++) {
        let best = Infinity, second = Infinity, bestIdx = 0;
        seeds.forEach((s, i) => {
          const ax = Math.abs(s.x - x), ay = Math.abs(s.y - y);
          const dx = Math.min(ax, TEXEL - ax), dy = Math.min(ay, TEXEL - ay);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < best) { second = best; best = d; bestIdx = i; }
          else if (d < second) { second = d; }
        });
        const mortar = second - best < 1.1;
        put(x, y, [126, 126, 126], mortar ? 0.5 : seeds[bestIdx].m * (0.93 + rnd() * 0.14));
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

const BLOCK_PRESETS = {
  "Eyebrow": { sample: "LABEL", font: "Oswald", size: 18, weight: 400, color: "Light Grey", letterSpacing: 8, uppercase: true, italic: false, align: "center", lineHeight: 1.2, strikethrough: false, strikeStyle: "straight", pixelShadow: false },
  "Hero Bold": { sample: "HEADLINE", font: "Oswald", size: 96, weight: 700, color: "White", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 0.95, strikethrough: false, strikeStyle: "straight", pixelShadow: false },
  "Hero Accent": { sample: "ACCENT", font: "Oswald", size: 96, weight: 700, color: "Estus Orange", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 0.95, strikethrough: false, strikeStyle: "straight", pixelShadow: false },
  "Serif Subtitle": { sample: "Subtitle here.", font: "Libre Baskerville", size: 36, weight: 400, color: "Cream", letterSpacing: 0, uppercase: false, italic: true, align: "center", lineHeight: 1.3, strikethrough: false, strikeStyle: "straight", pixelShadow: false },
  "Body": { sample: "Body text here.", font: "Inter", size: 24, weight: 400, color: "Light Grey", letterSpacing: 0, uppercase: false, italic: false, align: "center", lineHeight: 1.5, strikethrough: false, strikeStyle: "straight", pixelShadow: false },
  "CTA Label": { sample: "BUTTON TEXT", font: "Oswald", size: 22, weight: 600, color: "White", letterSpacing: 4, uppercase: true, italic: false, align: "center", lineHeight: 1.2, strikethrough: false, strikeStyle: "straight", pixelShadow: false },
  "Checklist Item": { sample: "Checklist item.", font: "Inter", size: 32, weight: 500, color: "Cream", letterSpacing: 0, uppercase: false, italic: false, align: "left", lineHeight: 1.4, strikethrough: false, strikeStyle: "straight", pixelShadow: false },
};
// Same keys as the base pack — templates address presets by key, so keeping the
// keys aligned means every template composes under every brand — but re-typed
// in bitmap faces, re-coloured, and with the drop shadow on by default.
const MINECRAFT_PRESETS = {
  "Eyebrow": { label: "Sign Line", sample: "ADVANCEMENT MADE!", font: "Silkscreen", size: 20, weight: 400, color: "Gold", letterSpacing: 2, uppercase: true, italic: false, align: "center", lineHeight: 1.3, strikethrough: false, strikeStyle: "straight", pixelShadow: true },
  "Hero Bold": { label: "Title", sample: "TAKING", font: "Press Start 2P", size: 58, weight: 400, color: "White", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 1.35, strikethrough: false, strikeStyle: "straight", pixelShadow: true },
  "Hero Accent": { label: "Title Accent", sample: "INVENTORY", font: "Press Start 2P", size: 58, weight: 400, color: "Gold", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 1.35, strikethrough: false, strikeStyle: "straight", pixelShadow: true },
  "Serif Subtitle": { label: "Subtitle", sample: "Notice what you carry.", font: "Silkscreen", size: 28, weight: 400, color: "Diamond", letterSpacing: 0, uppercase: false, italic: false, align: "center", lineHeight: 1.4, strikethrough: false, strikeStyle: "straight", pixelShadow: true },
  "Body": { label: "Lore Text", sample: "Body text here.", font: "VT323", size: 34, weight: 400, color: "Iron Grey", letterSpacing: 0, uppercase: false, italic: false, align: "center", lineHeight: 1.25, strikethrough: false, strikeStyle: "straight", pixelShadow: true },
  "CTA Label": { label: "Button", sample: "RESPAWN", font: "Silkscreen", size: 24, weight: 700, color: "White", letterSpacing: 3, uppercase: true, italic: false, align: "center", lineHeight: 1.3, strikethrough: false, strikeStyle: "straight", pixelShadow: true },
  "Checklist Item": { label: "Advancement", sample: "Craft a sensory toolkit.", font: "VT323", size: 40, weight: 400, color: "Iron Grey", letterSpacing: 0, uppercase: false, italic: false, align: "left", lineHeight: 1.2, strikethrough: false, strikeStyle: "straight", pixelShadow: true },
};
const BRAND_PRESETS = { "Minecraft": MINECRAFT_PRESETS };
const presetsFor = (brand) => BRAND_PRESETS[brand] || BLOCK_PRESETS;
// `label` and `sample` describe the preset in the UI; they are not block state.
const presetStyle = ({ label, sample, ...style }) => style;

const BASE_TEMPLATES = [
  ["hero-statement", "Hero Statement"],
  ["quote-card", "Quote Card"],
  ["protocol-tip", "Protocol Tip"],
  ["stat-callout", "Stat Callout"],
  ["therapy-goals", "Therapy Goals"],
];
const MINECRAFT_TEMPLATES = [
  ["mc-advancement", "Advancement"],
  ["mc-respawn", "Respawn"],
  ["mc-toolkit", "Toolkit"],
];

const defaultBlocks = [
  { id: "1", text: "OCCUPATIONAL THERAPY", ...presetStyle(BLOCK_PRESETS["Eyebrow"]), marginTop: 0 },
  { id: "2", text: "BEING\nYOURSELF", ...presetStyle(BLOCK_PRESETS["Hero Bold"]), marginTop: 24 },
  { id: "3", text: "ISN'T THE\nPROBLEM.", ...presetStyle(BLOCK_PRESETS["Hero Accent"]), marginTop: 0 },
  { id: "4", text: "It's the starting point.", ...presetStyle(BLOCK_PRESETS["Serif Subtitle"]), marginTop: 24 },
  { id: "5", text: "Neuroaffirming. Evidence-informed.\nEnvironment-focused.", ...presetStyle(BLOCK_PRESETS["Body"]), marginTop: 24 },
];
let blockIdCounter = 100;
const AccentContext = createContext(BRANDS["Estus"].accent);

export default function EstusSocialCreator() {
  const [brand, setBrand] = useState("Estus");
  const [blocks, setBlocks] = useState(defaultBlocks);
  const [selectedId, setSelectedId] = useState(null);
  const [canvasSize, setCanvasSize] = useState("IG Story (1080x1920)");
  const [bgColor, setBgColor] = useState("Off-Black");
  const [padding, setPadding] = useState(60);
  const [verticalAlign, setVerticalAlign] = useState("center");
  const [exporting, setExporting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [bgImage, setBgImage] = useState(null);
  const [bgImageObj, setBgImageObj] = useState(null);
  const [bgFit, setBgFit] = useState("cover");
  const [bgPositionX, setBgPositionX] = useState(50);
  const [bgPositionY, setBgPositionY] = useState(50);
  const [overlayColor, setOverlayColor] = useState("Black");
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const [bgBlur, setBgBlur] = useState(0);
  const [texture, setTexture] = useState("none");
  const [texBlockSize, setTexBlockSize] = useState(128);
  const [texShade, setTexShade] = useState(0.5);
  const [textures, setTextures] = useState(null);
  const fileInputRef = useRef(null);
  const size = CANVAS_SIZES[canvasSize];
  const scale = Math.min(380 / size.w, 680 / size.h);
  const selected = blocks.find((b) => b.id === selectedId);
  const accent = BRANDS[brand].accent;
  const presets = presetsFor(brand);

  // Built after mount so the server-rendered markup and the first client render
  // agree (there is no canvas to rasterise tiles with during SSR).
  useEffect(() => {
    const built = {};
    TEXTURE_KINDS.forEach((kind) => {
      if (kind === "none") return;
      const canvas = makeTextureCanvas(kind);
      built[kind] = { canvas, url: canvas.toDataURL() };
    });
    setTextures(built);
  }, []);

  const activeTexture = textures && texture !== "none" ? textures[texture] : null;

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setBgImage(dataUrl);
      const img = new Image();
      img.onload = () => setBgImageObj(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const clearImage = useCallback(() => {
    setBgImage(null);
    setBgImageObj(null);
  }, []);

  const updateBlock = useCallback((id, updates) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  // Presets/templates are written with Estus colour names; translate into the active brand
  const presetColor = useCallback((color) => BRAND_REMAP[brand].text[color] || color, [brand]);

  const switchBrand = useCallback((next) => {
    if (next === brand) return;
    const map = BRAND_REMAP[next];
    const toPixel = next === "Minecraft";
    const fromPixel = brand === "Minecraft";
    setBlocks((prev) => prev.map((b) => {
      const swap = fontSwapFor(next, b.font, b.size);
      const font = swap ? swap.font : b.font;
      return {
        ...b,
        color: map.text[b.color] || (BRANDS[next].colors[b.color] ? b.color : BRANDS[next].defaultText),
        font,
        size: swap ? Math.max(8, Math.round(b.size * swap.scale)) : b.size,
        lineHeight: swap && swap.minLineHeight ? Math.max(b.lineHeight, swap.minLineHeight) : b.lineHeight,
        weight: clampWeight(font, b.weight),
        // Bitmap faces have no italic cut, and the game's hard drop shadow is
        // the whole look — both are decided by the brand, not carried across it.
        italic: toPixel ? false : b.italic,
        pixelShadow: toPixel ? true : fromPixel ? false : b.pixelShadow,
      };
    }));
    setBgColor((c) => map.bg[c] || (BRANDS[next].colors[c] ? c : BRANDS[next].defaultBg));
    setOverlayColor((c) => map.overlay[c] || (BRANDS[next].overlays[c] ? c : "Black"));
    if (toPixel) {
      setTexture("dirt");
      setTexShade(0.5);
    } else if (fromPixel) {
      setTexture("none");
    }
    setBrand(next);
  }, [brand]);

  const addBlock = useCallback((presetName) => {
    const preset = presets[presetName];
    const newBlock = {
      id: String(++blockIdCounter),
      text: preset.sample,
      ...presetStyle(preset),
      color: presetColor(preset.color),
      marginTop: 16,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  }, [presets, presetColor]);

  const removeBlock = useCallback((id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const moveBlock = useCallback((id, dir) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === prev.length - 1)) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  }, []);

  const duplicateBlock = useCallback((id) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const orig = prev[idx];
      const dup = { ...orig, id: String(++blockIdCounter) };
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Ensure all fonts used are loaded before drawing to canvas. Weight 400 is
      // requested alongside the block's own weight so a family that ships only
      // one face (the pixel fonts) still resolves and never silently falls back
      // to a system font mid-export.
      if (document.fonts) {
        const fontLoads = blocks.flatMap((b) => {
          const style = b.italic ? "italic" : "normal";
          return [b.weight, 400].map((w) =>
            document.fonts.load(`${style} ${w} ${b.size}px ${FONTS[b.font]}`).catch(() => {})
          );
        });
        await Promise.all(fontLoads);
        await document.fonts.ready;
      }

      const canvas = document.createElement("canvas");
      canvas.width = size.w;
      canvas.height = size.h;
      const ctx = canvas.getContext("2d");

      // Background colour
      ctx.fillStyle = canvasFill(ctx, bgColor, 0, 0, size.w, size.h);
      ctx.fillRect(0, 0, size.w, size.h);

      // Block texture: the 16-texel tile blown up to the chosen block size with
      // smoothing off, then darkened the way the game dims its menu backdrop.
      if (activeTexture) {
        const s = texBlockSize / TEXEL;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.scale(s, s);
        ctx.fillStyle = ctx.createPattern(activeTexture.canvas, "repeat");
        ctx.fillRect(0, 0, size.w / s, size.h / s);
        ctx.restore();
        if (texShade > 0) {
          ctx.save();
          ctx.globalAlpha = texShade;
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, size.w, size.h);
          ctx.restore();
        }
      }

      // Background image + overlay
      if (bgImageObj) {
        ctx.save();
        if (bgBlur > 0) {
          ctx.filter = `blur(${bgBlur}px)`;
          drawImageFit(ctx, bgImageObj, size.w, size.h, bgFit, bgPositionX, bgPositionY, bgBlur * 3);
          ctx.filter = "none";
        } else {
          drawImageFit(ctx, bgImageObj, size.w, size.h, bgFit, bgPositionX, bgPositionY, 0);
        }
        ctx.restore();
        if (overlayOpacity > 0) {
          ctx.save();
          ctx.globalAlpha = overlayOpacity;
          ctx.fillStyle = ALL_OVERLAYS[overlayColor] || "#000000";
          ctx.fillRect(0, 0, size.w, size.h);
          ctx.restore();
        }
      }

      // letter-spacing in CSS is: block.letterSpacing * (block.size / 18) px per character gap
      // (same formula as preview, just at scale 1)
      const letterSpacingPx = (block) => block.letterSpacing * (block.size / 18);

      // Measure the true rendered width of a line including letter-spacing
      const measureLineWidth = (line, spacingPx) => {
        if (!line) return 0;
        if (spacingPx === 0) return ctx.measureText(line).width;
        let w = 0;
        for (const ch of line) w += ctx.measureText(ch).width;
        // CSS letter-spacing adds spacing after each character (n chars → n gaps)
        w += spacingPx * line.length;
        return w;
      };

      // Pre-measure all blocks so we can compute total height for vertical alignment
      const measured = blocks.map((block) => {
        const text = block.uppercase ? block.text.toUpperCase() : block.text;
        const lines = text.split("\n");
        const lh = block.size * block.lineHeight;
        const blockH = lines.length * lh;
        const spacingPx = letterSpacingPx(block);
        return { ...block, lines, lh, blockH, spacingPx };
      });

      const totalHeight = measured.reduce((sum, b) => sum + b.marginTop + b.blockH, 0);

      let y;
      if (verticalAlign === "top") y = padding;
      else if (verticalAlign === "bottom") y = size.h - padding - totalHeight;
      else y = (size.h - totalHeight) / 2;

      ctx.textBaseline = "top";

      // One line of type, drawn at an offset in a single colour. Used twice per
      // line: once for the drop shadow, once for the fill.
      const paintLine = (block, line, x, drawY, dx, dy, fillStyle) => {
        ctx.fillStyle = fillStyle;
        if (block.spacingPx !== 0) {
          let cx = x + dx;
          for (const char of line) {
            ctx.fillText(char, cx, drawY + dy);
            cx += ctx.measureText(char).width + block.spacingPx;
          }
        } else {
          ctx.fillText(line, x + dx, drawY + dy);
        }
      };

      measured.forEach((block) => {
        y += block.marginTop;

        const fontStyle = block.italic ? "italic" : "normal";
        const fontStr = `${fontStyle} ${block.weight} ${block.size}px ${FONTS[block.font]}`;
        ctx.font = fontStr;

        // CSS line-height centres the glyph in the line box with equal space above/below.
        // textBaseline "top" draws from the top of the em square, so we offset by half-leading
        // to match the visual position in the browser preview.
        const halfLeading = block.size * (block.lineHeight - 1) / 2;
        const offset = block.pixelShadow ? shadowOffset(block.size) : 0;
        const shadowFill = block.pixelShadow ? shadowColorOf(block.color) : null;

        block.lines.forEach((line) => {
          // Re-set font in case any previous draw mutated ctx state
          ctx.font = fontStr;

          const lineW = measureLineWidth(line, block.spacingPx);

          let x;
          if (block.align === "left") x = padding;
          else if (block.align === "right") x = size.w - padding - lineW;
          else x = (size.w - lineW) / 2;

          const drawY = y + halfLeading;

          if (shadowFill && line) {
            paintLine(block, line, x, drawY, offset, offset, shadowFill);
            if (block.strikethrough) {
              drawStrike(ctx, block.strikeStyle, x + offset, drawY + offset, lineW, block.size, shadowFill);
            }
          }

          // Gradient fills span the rendered line, so set fill per line
          paintLine(block, line, x, drawY, 0, 0, canvasFill(ctx, block.color, x, 0, x + lineW, 0));

          if (block.strikethrough && line) {
            drawStrike(ctx, block.strikeStyle, x, drawY, lineW, block.size, solidColor(block.color));
          }

          y += block.lh;
        });
      });

      const link = document.createElement("a");
      link.download = `${BRANDS[brand].slug}-social-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export error:", e);
    }
    setExporting(false);
  }, [blocks, size, bgColor, bgImageObj, bgFit, bgPositionX, bgPositionY, bgBlur, overlayColor, overlayOpacity, padding, verticalAlign, brand, activeTexture, texBlockSize, texShade]);

  // Templates are authored once, against the Estus preset sizes. `block()`
  // instantiates one against the active brand's pack: any explicit `size` is
  // rescaled by that brand's ratio for the same preset, so a 160px stat set in
  // Oswald comes out at the equivalent 97px in Press Start 2P instead of
  // running off the canvas. Brands sharing the base pack get a ratio of 1 and
  // therefore byte-identical output.
  const block = useCallback((presetName, text, overrides = {}) => {
    const style = presetStyle(presets[presetName]);
    const ratio = style.size / BLOCK_PRESETS[presetName].size;
    const out = { id: String(++blockIdCounter), text, ...style, ...overrides };
    if (overrides.size != null) out.size = Math.max(8, Math.round(overrides.size * ratio));
    out.color = presetColor(overrides.color || style.color);
    return out;
  }, [presets, presetColor]);

  const applyTemplate = useCallback((name) => {
    const T = {
      "hero-statement": () => [
        block("Eyebrow", "OCCUPATIONAL THERAPY", { marginTop: 0 }),
        block("Hero Bold", "BEING\nYOURSELF", { marginTop: 24 }),
        block("Hero Accent", "ISN'T THE\nPROBLEM.", { marginTop: 0 }),
        block("Serif Subtitle", "It's the starting point.", { marginTop: 24 }),
        block("Body", "Neuroaffirming. Evidence-informed.\nEnvironment-focused.", { marginTop: 24 }),
      ],
      "quote-card": () => [
        block("Eyebrow", "ESTUS HEALTH", { marginTop: 0 }),
        block("Serif Subtitle", "Your brain isn't broken.\nThe system wasn't\nbuilt for you.", { size: 44, marginTop: 40 }),
        block("Body", "www.estushealth.com", { size: 18, color: "Mid Grey", marginTop: 48 }),
      ],
      "protocol-tip": () => [
        block("Eyebrow", "PERFORMANCE LAB: PROTOCOLS", { marginTop: 0 }),
        block("Hero Bold", "PROTOCOL #12", { size: 64, marginTop: 24 }),
        block("Hero Accent", "THE 2-MINUTE\nRULE", { size: 72, marginTop: 0 }),
        block("Body", "If it takes less than 2 minutes,\ndo it now. Don't add it to the list.", { size: 22, color: "Cream", marginTop: 32 }),
        block("Body", "performancelab@estushealth.com", { size: 16, color: "Mid Grey", marginTop: 40 }),
      ],
      "stat-callout": () => [
        block("Eyebrow", "DID YOU KNOW?", { color: "Estus Orange", marginTop: 0 }),
        block("Hero Bold", "70%", { size: 160, color: "White", marginTop: 16 }),
        block("Body", "of late-diagnosed autistic adults\nreport burnout as their\nprimary presentation.", { size: 26, color: "Cream", marginTop: 8 }),
        block("Eyebrow", "ESTUS HEALTH", { marginTop: 48 }),
      ],
      "therapy-goals": () => [
        block("Eyebrow", "OCCUPATIONAL THERAPY", { align: "left", marginTop: 0 }),
        block("Hero Bold", "WHAT IS YOUR\nNEXT THERAPY\nGOAL?", { size: 72, align: "left", marginTop: 20 }),
        block("Checklist Item", "Set a regular sleep schedule", { marginTop: 36, strikethrough: true, strikeStyle: "straight" }),
        block("Checklist Item", "Build a sensory toolkit", { marginTop: 12, strikethrough: true, strikeStyle: "wavy" }),
        block("Checklist Item", "Practice unmasking with safe people", { marginTop: 12 }),
        block("Checklist Item", "Identify burnout triggers", { marginTop: 12 }),
        block("Checklist Item", "Plan recovery time after socialising", { marginTop: 12 }),
        block("Checklist Item", "Ask for accommodations at work", { marginTop: 12 }),
        block("Checklist Item", "Schedule a self-care ritual weekly", { marginTop: 12 }),
      ],
      // The Minecraft-only templates are written in the Minecraft palette's own
      // names — they are offered only under that brand, and `presetColor` passes
      // a name through untouched when the active brand already owns it.
      "mc-advancement": () => [
        block("Eyebrow", "ADVANCEMENT MADE!", { marginTop: 0 }),
        block("Hero Bold", "TAKING", { marginTop: 28 }),
        block("Hero Accent", "INVENTORY", { marginTop: 0 }),
        block("Serif Subtitle", "Noticing what you're carrying\nis the first step to putting\nsome of it down.", { marginTop: 32 }),
        block("Body", "estushealth.com", { size: 20, color: "Stone Grey", marginTop: 44 }),
      ],
      "mc-respawn": () => [
        block("Hero Bold", "YOU DIED!", { size: 120, color: "Redstone", marginTop: 0 }),
        block("Serif Subtitle", "Burnout is not a game over.", { marginTop: 36 }),
        block("Body", "Your inventory is intact.\nRest at the checkpoint,\nthen come back for it.", { size: 26, color: "Iron Grey", marginTop: 28 }),
        block("CTA Label", "RESPAWN", { size: 32, marginTop: 48 }),
      ],
      "mc-toolkit": () => [
        block("Eyebrow", "SENSORY TOOLKIT", { align: "left", marginTop: 0 }),
        block("Hero Bold", "INVENTORY\nCHECK", { size: 72, align: "left", marginTop: 20 }),
        block("Checklist Item", "Loop earplugs", { marginTop: 36, strikethrough: true, strikeStyle: "straight" }),
        block("Checklist Item", "Sunglasses for strip lighting", { marginTop: 12, strikethrough: true, strikeStyle: "straight" }),
        block("Checklist Item", "Fidget you actually like", { marginTop: 12 }),
        block("Checklist Item", "Snack that needs no decision", { marginTop: 12 }),
        block("Checklist Item", "Exit plan, agreed in advance", { marginTop: 12 }),
        block("Checklist Item", "One person who gets it", { marginTop: 12 }),
      ],
    };
    if (T[name]) setBlocks(T[name]());
    setSelectedId(null);
  }, [block]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderPreviewBlock = (block) => {
    const text = block.uppercase ? block.text.toUpperCase() : block.text;
    const lines = text.split("\n");
    // Same integer offset the export uses, expressed in preview pixels, so the
    // shadow lands identically in both.
    const offset = block.pixelShadow ? shadowOffset(block.size) * scale : 0;
    const shadowFill = block.pixelShadow ? shadowColorOf(block.color) : null;
    return (
      <div
        key={block.id}
        onClick={(e) => { e.stopPropagation(); setSelectedId((prev) => prev === block.id ? null : block.id); }}
        style={{
          marginTop: block.marginTop * scale,
          textAlign: block.align,
          cursor: "pointer",
          outline: selectedId === block.id ? `2px solid ${accent}` : "2px solid transparent",
          outlineOffset: 4 * scale,
          borderRadius: 2,
          transition: "outline-color 0.15s",
          padding: `0 ${2 * scale}px`,
          position: "relative",
          zIndex: 2,
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONTS[block.font],
              fontSize: block.size * scale,
              fontWeight: block.weight,
              fontStyle: block.italic ? "italic" : "normal",
              color: isGradient(block.color) ? "transparent" : colorValue(block.color),
              letterSpacing: block.letterSpacing * scale * (block.size / 18),
              lineHeight: block.lineHeight,
              whiteSpace: "pre",
              position: "relative",
            }}
          >
            {shadowFill && line && (
              // A full-width absolute copy that inherits text-align, wrapping an
              // inline-block twin of the fill span. Matching the structure means
              // it matches the geometry — including the strike overlay, which is
              // positioned against its inline-block parent. Both layers are
              // positioned with z-index auto, so tree order keeps this one behind.
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  transform: `translate(${offset}px, ${offset}px)`,
                  textAlign: "inherit",
                  color: shadowFill,
                  pointerEvents: "none",
                }}
              >
                <span style={{ position: "relative", display: "inline-block" }}>
                  {line}
                  {block.strikethrough && (
                    <StrikeOverlay variant={block.strikeStyle} color={shadowFill} fontSize={block.size * scale} />
                  )}
                </span>
              </span>
            )}
            <span
              style={{
                position: "relative",
                display: "inline-block",
                // background-clip: text must sit on the element that directly
                // contains the text node, or Chromium won't paint it
                ...(isGradient(block.color) ? {
                  backgroundImage: cssBackground(block.color),
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                } : {}),
              }}
            >
              {line || " "}
              {block.strikethrough && line && (
                <StrikeOverlay
                  variant={block.strikeStyle}
                  color={solidColor(block.color)}
                  fontSize={block.size * scale}
                />
              )}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AccentContext.Provider value={accent}>
    <div style={{ display: "flex", height: "100vh", background: "#111", color: "#eee", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
      {/* Preview */}
      <div onClick={() => setSelectedId(null)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, minWidth: 0, position: "relative" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {Object.keys(CANVAS_SIZES).map((name) => (
            <button
              key={name}
              onClick={(e) => { e.stopPropagation(); setCanvasSize(name); }}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                background: canvasSize === name ? accent : "#333",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div
          onClick={() => setSelectedId(null)}
          style={{
            width: size.w * scale,
            height: size.h * scale,
            background: cssBackground(bgColor, 135),
            display: "flex",
            flexDirection: "column",
            justifyContent: verticalAlign === "top" ? "flex-start" : verticalAlign === "bottom" ? "flex-end" : "center",
            padding: padding * scale,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {activeTexture && (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${activeTexture.url})`,
                  backgroundSize: `${texBlockSize * scale}px ${texBlockSize * scale}px`,
                  backgroundRepeat: "repeat",
                  imageRendering: "pixelated",
                  zIndex: 0,
                }}
              />
              {texShade > 0 && (
                <div style={{ position: "absolute", inset: 0, background: "#000", opacity: texShade, zIndex: 0 }} />
              )}
            </>
          )}
          {bgImage && (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: bgFit === "fill" ? "100% 100%" : bgFit,
                  backgroundPosition: `${bgPositionX}% ${bgPositionY}%`,
                  backgroundRepeat: "no-repeat",
                  filter: bgBlur > 0 ? `blur(${bgBlur * scale}px)` : "none",
                  transform: bgBlur > 0 ? "scale(1.1)" : "none",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: ALL_OVERLAYS[overlayColor] || "#000000",
                  opacity: overlayOpacity,
                  zIndex: 1,
                }}
              />
            </>
          )}
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: verticalAlign === "top" ? "flex-start" : verticalAlign === "bottom" ? "flex-end" : "center", flex: 1 }}>
            <div>
              {blocks.map((block) => renderPreviewBlock(block))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleExport(); }}
            disabled={exporting}
            style={{
              padding: "10px 28px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Oswald', sans-serif",
              textTransform: "uppercase",
              letterSpacing: 2,
              background: exporting ? "#666" : accent,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: exporting ? "wait" : "pointer",
            }}
          >
            {exporting ? "Exporting..." : "Export PNG"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSidebar(!showSidebar); }}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {showSidebar ? "Hide Panel" : "Show Panel"}
          </button>
        </div>
      </div>
      {/* Sidebar */}
      {showSidebar && (
        <div style={{ width: 340, background: "#1a1a1a", borderLeft: "1px solid #333", overflowY: "auto", padding: 16, flexShrink: 0 }}>
          <SectionLabel>Brand</SectionLabel>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {Object.keys(BRANDS).map((b) => (
              <button
                key={b}
                onClick={() => switchBrand(b)}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Oswald', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  background: brand === b ? BRANDS[b].accent : "#2a2a2a",
                  color: brand === b ? "#fff" : "#ccc",
                  border: brand === b ? "1px solid transparent" : "1px solid #444",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {b}
              </button>
            ))}
          </div>
          <SectionLabel>Templates</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            {[...BASE_TEMPLATES, ...(brand === "Minecraft" ? MINECRAFT_TEMPLATES : [])].map(([key, label]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                style={{
                  padding: "8px 6px",
                  fontSize: 11,
                  fontWeight: 500,
                  background: "#2a2a2a",
                  color: "#ccc",
                  border: "1px solid #444",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <SectionLabel>Canvas</SectionLabel>
          <Row label="Background">
            <ColorPicker value={bgColor} onChange={setBgColor} colors={BRANDS[brand].colors} accent={BRANDS[brand].accent} />
          </Row>
          <Row label="Padding">
            <RangeInput value={padding} min={20} max={120} onChange={setPadding} />
          </Row>
          <Row label="V. Align">
            <select value={verticalAlign} onChange={(e) => setVerticalAlign(e.target.value)} style={selectStyle}>
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </Row>
          {brand === "Minecraft" && (
            <>
              <SectionLabel style={{ marginTop: 20 }}>Block Texture</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                {TEXTURE_KINDS.map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setTexture(kind)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px",
                      fontSize: 11,
                      fontWeight: 500,
                      background: texture === kind ? `${accent}22` : "#2a2a2a",
                      color: texture === kind ? "#fff" : "#ccc",
                      border: `1px solid ${texture === kind ? accent : "#444"}`,
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                        borderRadius: 2,
                        border: "1px solid #555",
                        background: textures?.[kind] ? `url(${textures[kind].url})` : "#111",
                        backgroundSize: "32px 32px",
                        imageRendering: "pixelated",
                      }}
                    />
                    {TEXTURE_LABELS[kind]}
                  </button>
                ))}
              </div>
              {texture !== "none" && (
                <>
                  <Row label="Block Size">
                    <RangeInput value={texBlockSize} min={32} max={320} step={8} onChange={setTexBlockSize} />
                  </Row>
                  <Row label="Shade">
                    <RangeInput value={texShade} min={0} max={0.9} step={0.05} onChange={setTexShade} />
                  </Row>
                </>
              )}
            </>
          )}
          <SectionLabel style={{ marginTop: 20 }}>Background Image</SectionLabel>
          {!bgImage ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 12,
                fontWeight: 500,
                background: "#222",
                color: "#aaa",
                border: "2px dashed #444",
                borderRadius: 6,
                cursor: "pointer",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>+</span> Upload Image
            </button>
          ) : (
            <>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <div style={{ width: "100%", height: 80, borderRadius: 6, overflow: "hidden", border: "1px solid #444" }}>
                  <img src={bgImage} alt="bg preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ flex: 1, padding: "6px", fontSize: 11, background: "#2a2a2a", color: "#ccc", border: "1px solid #444", borderRadius: 4, cursor: "pointer" }}
                  >
                    Replace
                  </button>
                  <button
                    onClick={clearImage}
                    style={{ padding: "6px 12px", fontSize: 11, background: "#4a2020", color: "#f88", border: "1px solid #633", borderRadius: 4, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <Row label="Fit">
                <div style={{ display: "flex", gap: 4 }}>
                  {["cover", "contain", "fill"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setBgFit(f)}
                      style={{ padding: "4px 10px", fontSize: 11, background: bgFit === f ? accent : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", textTransform: "capitalize" }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Position X">
                <RangeInput value={bgPositionX} min={0} max={100} onChange={setBgPositionX} />
              </Row>
              <Row label="Position Y">
                <RangeInput value={bgPositionY} min={0} max={100} onChange={setBgPositionY} />
              </Row>
              <Row label="Blur">
                <RangeInput value={bgBlur} min={0} max={30} onChange={setBgBlur} />
              </Row>
              <div style={{ marginTop: 4, marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Overlay</div>
              </div>
              <Row label="Color">
                <div style={{ display: "flex", gap: 3 }}>
                  {Object.entries(BRANDS[brand].overlays).map(([name, hex]) => (
                    <button
                      key={name}
                      title={name}
                      onClick={() => setOverlayColor(name)}
                      style={{ width: 22, height: 22, borderRadius: 3, background: hex, border: overlayColor === name ? `2px solid ${accent}` : "1px solid #555", cursor: "pointer", padding: 0 }}
                    />
                  ))}
                </div>
              </Row>
              <Row label="Opacity">
                <RangeInput value={overlayOpacity} min={0} max={1} step={0.05} onChange={setOverlayOpacity} />
              </Row>
            </>
          )}
          <SectionLabel style={{ marginTop: 20 }}>Add Text Block</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            {Object.entries(presets).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => addBlock(name)}
                style={{ padding: "8px 6px", fontSize: 11, fontWeight: 500, background: "#2a2a2a", color: "#ccc", border: "1px solid #444", borderRadius: 4, cursor: "pointer" }}
              >
                + {preset.label || name}
              </button>
            ))}
          </div>
          <SectionLabel>Layers ({blocks.length})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {blocks.map((b, i) => (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                style={{
                  padding: "6px 8px",
                  fontSize: 11,
                  background: selectedId === b.id ? `${accent}22` : "#222",
                  border: `1px solid ${selectedId === b.id ? accent : "#333"}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#ccc",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                  <span style={{ color: "#888", marginRight: 4 }}>{i + 1}.</span>
                  <span style={{ textDecoration: b.strikethrough ? "line-through" : "none" }}>
                    {b.text.split("\n")[0].substring(0, 22)}
                  </span>
                </span>
                <div style={{ display: "flex", gap: 2 }}>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); updateBlock(b.id, { strikethrough: !b.strikethrough }); }} active={b.strikethrough}>S</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); moveBlock(b.id, -1); }}>↑</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); moveBlock(b.id, 1); }}>↓</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); duplicateBlock(b.id); }}>⎘</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }} danger>✕</MiniBtn>
                </div>
              </div>
            ))}
          </div>
          {selected && (
            <>
              <SectionLabel>Edit Block</SectionLabel>
              <textarea
                value={selected.text}
                onChange={(e) => updateBlock(selected.id, { text: e.target.value })}
                rows={3}
                style={{ width: "100%", background: "#222", color: "#eee", border: "1px solid #444", borderRadius: 4, padding: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 12, boxSizing: "border-box" }}
              />
              <Row label="Font">
                <select
                  value={selected.font}
                  // Weights that the family doesn't ship would be synthesised;
                  // snap to the nearest real face instead.
                  onChange={(e) => updateBlock(selected.id, { font: e.target.value, weight: clampWeight(e.target.value, selected.weight) })}
                  style={selectStyle}
                >
                  {Object.keys(FONTS).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Row>
              <Row label="Size">
                <RangeInput value={selected.size} min={10} max={200} onChange={(v) => updateBlock(selected.id, { size: v })} />
              </Row>
              <Row label="Weight">
                <select value={selected.weight} onChange={(e) => updateBlock(selected.id, { weight: Number(e.target.value) })} style={selectStyle}>
                  {FONT_WEIGHTS[selected.font].map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Row>
              <Row label="Color">
                <ColorPicker value={selected.color} onChange={(v) => updateBlock(selected.id, { color: v })} colors={BRANDS[brand].colors} accent={BRANDS[brand].accent} />
              </Row>
              <Row label="Align">
                <div style={{ display: "flex", gap: 4 }}>
                  {["left", "center", "right"].map((a) => (
                    <button
                      key={a}
                      onClick={() => updateBlock(selected.id, { align: a })}
                      style={{ padding: "4px 10px", fontSize: 11, background: selected.align === a ? accent : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", textTransform: "capitalize" }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Spacing">
                <RangeInput value={selected.letterSpacing} min={0} max={20} onChange={(v) => updateBlock(selected.id, { letterSpacing: v })} />
              </Row>
              <Row label="Line H.">
                <RangeInput value={selected.lineHeight} min={0.7} max={2.0} step={0.05} onChange={(v) => updateBlock(selected.id, { lineHeight: v })} />
              </Row>
              <Row label="Margin Top">
                <RangeInput value={selected.marginTop} min={0} max={120} onChange={(v) => updateBlock(selected.id, { marginTop: v })} />
              </Row>
              <Row label="Style">
                <div style={{ display: "flex", gap: 4 }}>
                  <ToggleBtn title="Uppercase" active={selected.uppercase} onClick={() => updateBlock(selected.id, { uppercase: !selected.uppercase })}>ABC</ToggleBtn>
                  <ToggleBtn title="Italic" active={selected.italic} onClick={() => updateBlock(selected.id, { italic: !selected.italic })}><em>I</em></ToggleBtn>
                  <ToggleBtn title="Strikethrough" active={!!selected.strikethrough} onClick={() => updateBlock(selected.id, { strikethrough: !selected.strikethrough })}><span style={{ textDecoration: "line-through" }}>S</span></ToggleBtn>
                  <ToggleBtn title="Pixel drop shadow" active={!!selected.pixelShadow} onClick={() => updateBlock(selected.id, { pixelShadow: !selected.pixelShadow })}>◤</ToggleBtn>
                </div>
              </Row>
              {selected.strikethrough && (
                <Row label="Strike">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "flex-end" }}>
                    {STRIKE_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateBlock(selected.id, { strikeStyle: s })}
                        title={s}
                        style={{
                          padding: "3px 8px",
                          fontSize: 10,
                          background: (selected.strikeStyle || "straight") === s ? accent : "#333",
                          color: "#fff",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Row>
              )}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Apply Preset Style</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {Object.entries(presets).map(([name, preset]) => (
                    <button
                      key={name}
                      onClick={() => updateBlock(selected.id, { ...presetStyle(preset), color: presetColor(preset.color) })}
                      style={{ padding: "3px 8px", fontSize: 10, background: "#2a2a2a", color: "#999", border: "1px solid #444", borderRadius: 3, cursor: "pointer" }}
                    >
                      {preset.label || name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </AccentContext.Provider>
  );
}

function drawStrike(ctx, variant, x, drawY, w, fontSize, color) {
  if (!w || w <= 0) return;
  const thickness = Math.max(1, fontSize * 0.06);
  const centerY = drawY + fontSize * 0.5;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (variant === "double") {
    const offset = thickness * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, centerY - offset);
    ctx.lineTo(x + w, centerY - offset);
    ctx.moveTo(x, centerY + offset);
    ctx.lineTo(x + w, centerY + offset);
    ctx.stroke();
  } else if (variant === "diagonal") {
    ctx.beginPath();
    ctx.moveTo(x, drawY + fontSize * 0.92);
    ctx.lineTo(x + w, drawY + fontSize * 0.08);
    ctx.stroke();
  } else if (variant === "wavy") {
    const period = fontSize * 0.45;
    const amp = fontSize * 0.09;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    let cx = x;
    let dir = 1;
    while (cx < x + w) {
      const half = period / 2;
      const next = Math.min(cx + half, x + w);
      const ctrlX = (cx + next) / 2;
      const ctrlY = centerY + amp * dir;
      ctx.quadraticCurveTo(ctrlX, ctrlY, next, centerY);
      cx = next;
      dir *= -1;
    }
    ctx.stroke();
  } else if (variant === "scribble") {
    const segs = Math.max(8, Math.round(w / (fontSize * 0.45)));
    const amp = thickness * 1.4;
    const drawPath = (phase, lineW, opacity) => {
      ctx.globalAlpha = opacity;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(x, centerY + Math.sin(phase) * amp);
      for (let s = 1; s <= segs; s++) {
        const px = x + (w * s) / segs;
        const py = centerY + Math.sin(phase + s * 1.9) * amp;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    };
    drawPath(0, thickness, 1);
    drawPath(Math.PI, thickness * 0.7, 0.55);
  } else if (variant === "marker") {
    ctx.globalAlpha = 0.4;
    const h = fontSize * 0.6;
    const r = thickness;
    const top = drawY + fontSize * 0.2;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, top, w, h, r);
      ctx.fill();
    } else {
      ctx.fillRect(x, top, w, h);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(x, centerY + fontSize * 0.05);
    ctx.lineTo(x + w, centerY + fontSize * 0.05);
    ctx.stroke();
  }
  ctx.restore();
}

function drawImageFit(ctx, img, cw, ch, fit, posX, posY, bleedExtra) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  let dx = -bleedExtra, dy = -bleedExtra, dw = cw + bleedExtra * 2, dh = ch + bleedExtra * 2;
  if (fit === "cover") {
    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;
    if (imgRatio > canvasRatio) {
      const visibleWidth = ih * canvasRatio;
      sx = ((iw - visibleWidth) * posX) / 100;
      sw = visibleWidth;
    } else {
      const visibleHeight = iw / canvasRatio;
      sy = ((ih - visibleHeight) * posY) / 100;
      sh = visibleHeight;
    }
  } else if (fit === "contain") {
    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;
    if (imgRatio > canvasRatio) {
      const drawH = cw / imgRatio;
      dx = -bleedExtra;
      dy = ((ch - drawH) * posY) / 100 - bleedExtra;
      dw = cw + bleedExtra * 2;
      dh = drawH + bleedExtra * 2;
    } else {
      const drawW = ch * imgRatio;
      dx = ((cw - drawW) * posX) / 100 - bleedExtra;
      dy = -bleedExtra;
      dw = drawW + bleedExtra * 2;
      dh = ch + bleedExtra * 2;
    }
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function StrikeOverlay({ variant, color, fontSize }) {
  const thickness = Math.max(1, fontSize * 0.06);
  const baseStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    overflow: "visible",
  };

  if (variant === "double") {
    const offset = thickness * 1.1;
    return (
      <svg style={baseStyle} preserveAspectRatio="none">
        <line x1="0" y1={`calc(50% - ${offset}px)`} x2="100%" y2={`calc(50% - ${offset}px)`} stroke={color} strokeWidth={thickness} strokeLinecap="round" />
        <line x1="0" y1={`calc(50% + ${offset}px)`} x2="100%" y2={`calc(50% + ${offset}px)`} stroke={color} strokeWidth={thickness} strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "diagonal") {
    return (
      <svg style={baseStyle} preserveAspectRatio="none">
        <line x1="0%" y1="92%" x2="100%" y2="8%" stroke={color} strokeWidth={thickness} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  if (variant === "wavy") {
    return (
      <svg style={baseStyle} preserveAspectRatio="none" viewBox="0 0 100 20">
        <path
          d="M 0 10 Q 2.5 3 5 10 T 10 10 T 15 10 T 20 10 T 25 10 T 30 10 T 35 10 T 40 10 T 45 10 T 50 10 T 55 10 T 60 10 T 65 10 T 70 10 T 75 10 T 80 10 T 85 10 T 90 10 T 95 10 T 100 10"
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (variant === "scribble") {
    return (
      <svg style={baseStyle} preserveAspectRatio="none" viewBox="0 0 100 20">
        <path
          d="M 0 9 L 6 13 L 12 7 L 18 13 L 24 8 L 30 12 L 36 7 L 42 13 L 48 8 L 54 12 L 60 7 L 66 13 L 72 8 L 78 12 L 84 7 L 90 13 L 96 8 L 100 11"
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 0 11 L 6 7 L 12 13 L 18 8 L 24 12 L 30 7 L 36 13 L 42 8 L 48 12 L 54 7 L 60 13 L 66 8 L 72 12 L 78 7 L 84 13 L 90 8 L 96 12 L 100 9"
          fill="none"
          stroke={color}
          strokeWidth={thickness * 0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity="0.55"
        />
      </svg>
    );
  }

  if (variant === "marker") {
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "20%",
          height: "60%",
          background: color,
          opacity: 0.4,
          borderRadius: thickness,
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <svg style={baseStyle} preserveAspectRatio="none">
      <line x1="0" y1="55%" x2="100%" y2="55%" stroke={color} strokeWidth={thickness} strokeLinecap="round" />
    </svg>
  );
}

function SectionLabel({ children, style }) {
  const accent = useContext(AccentContext);
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, fontFamily: "'Oswald', sans-serif", ...style }}>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "#888", minWidth: 60 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>{children}</div>
    </div>
  );
}

function RangeInput({ value, min, max, step = 1, onChange }) {
  const accent = useContext(AccentContext);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 100, accentColor: accent }} />
      <span style={{ fontSize: 11, color: "#aaa", minWidth: 32, textAlign: "right" }}>{typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : value}</span>
    </div>
  );
}

function ColorPicker({ value, onChange, colors, accent }) {
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {Object.keys(colors).map((name) => {
        const hex = colors[name];
        return (
          <button
            key={name}
            title={name}
            onClick={() => onChange(name)}
            style={{ width: 18, height: 18, borderRadius: 3, background: cssBackground(name), border: value === name ? `2px solid ${accent}` : hex === "#000000" || hex === "#1A1A1A" ? "1px solid #555" : "1px solid #333", cursor: "pointer", padding: 0 }}
          />
        );
      })}
    </div>
  );
}

function MiniBtn({ children, onClick, danger, active }) {
  const accent = useContext(AccentContext);
  const bg = danger ? "#4a2020" : active ? accent : "#333";
  const color = danger ? "#f88" : active ? "#fff" : "#aaa";
  return (
    <button
      onClick={onClick}
      style={{ width: 20, height: 20, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", background: bg, color, border: "none", borderRadius: 3, cursor: "pointer", padding: 0 }}
    >
      {children}
    </button>
  );
}

function ToggleBtn({ children, active, onClick, title }) {
  const accent = useContext(AccentContext);
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ padding: "4px 10px", fontSize: 11, background: active ? accent : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

const selectStyle = {
  background: "#222",
  color: "#eee",
  border: "1px solid #444",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  maxWidth: 140,
};
