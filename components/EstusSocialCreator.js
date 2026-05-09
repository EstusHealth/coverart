"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const BRAND_COLORS = {
  "White": "#FFFFFF",
  "Estus Orange": "#E87A2E",
  "Noctua Brown": "#8B5A3C",
  "Light Grey": "#9CA3AF",
  "Mid Grey": "#6B7280",
  "Dark Grey": "#374151",
  "Off-Black": "#1A1A1A",
  "Pure Black": "#000000",
  "Cream": "#E8DDD0",
};
const OVERLAY_COLORS = {
  "Black": "#000000",
  "Off-Black": "#1A1A1A",
  "Noctua Brown": "#8B5A3C",
  "Estus Orange": "#E87A2E",
};
const FONTS = {
  "Oswald": "'Oswald', sans-serif",
  "Libre Baskerville": "'Libre Baskerville', serif",
  "Inter": "'Inter', sans-serif",
};
const CANVAS_SIZES = {
  "IG Square (1080x1080)": { w: 1080, h: 1080 },
  "IG Story (1080x1920)": { w: 1080, h: 1920 },
  "LinkedIn (1200x627)": { w: 1200, h: 627 },
  "X/Twitter (1200x675)": { w: 1200, h: 675 },
  "Facebook (1200x630)": { w: 1200, h: 630 },
  "YouTube Thumb (1280x720)": { w: 1280, h: 720 },
};
const STRIKE_STYLES = ["straight", "double", "diagonal", "wavy", "scribble", "marker"];
const BLOCK_PRESETS = {
  "Eyebrow": { font: "Oswald", size: 18, weight: 400, color: "Light Grey", letterSpacing: 8, uppercase: true, italic: false, align: "center", lineHeight: 1.2, strikethrough: false, strikeStyle: "straight" },
  "Hero Bold": { font: "Oswald", size: 96, weight: 700, color: "White", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 0.95, strikethrough: false, strikeStyle: "straight" },
  "Hero Accent": { font: "Oswald", size: 96, weight: 700, color: "Estus Orange", letterSpacing: 0, uppercase: true, italic: false, align: "center", lineHeight: 0.95, strikethrough: false, strikeStyle: "straight" },
  "Serif Subtitle": { font: "Libre Baskerville", size: 36, weight: 400, color: "Cream", letterSpacing: 0, uppercase: false, italic: true, align: "center", lineHeight: 1.3, strikethrough: false, strikeStyle: "straight" },
  "Body": { font: "Inter", size: 24, weight: 400, color: "Light Grey", letterSpacing: 0, uppercase: false, italic: false, align: "center", lineHeight: 1.5, strikethrough: false, strikeStyle: "straight" },
  "CTA Label": { font: "Oswald", size: 22, weight: 600, color: "White", letterSpacing: 4, uppercase: true, italic: false, align: "center", lineHeight: 1.2, strikethrough: false, strikeStyle: "straight" },
  "Checklist Item": { font: "Inter", size: 32, weight: 500, color: "Cream", letterSpacing: 0, uppercase: false, italic: false, align: "left", lineHeight: 1.4, strikethrough: false, strikeStyle: "straight" },
};
const defaultBlocks = [
  { id: "1", text: "OCCUPATIONAL THERAPY", ...BLOCK_PRESETS["Eyebrow"], marginTop: 0 },
  { id: "2", text: "BEING\nYOURSELF", ...BLOCK_PRESETS["Hero Bold"], marginTop: 24 },
  { id: "3", text: "ISN'T THE\nPROBLEM.", ...BLOCK_PRESETS["Hero Accent"], marginTop: 0 },
  { id: "4", text: "It's the starting point.", ...BLOCK_PRESETS["Serif Subtitle"], marginTop: 24 },
  { id: "5", text: "Neuroaffirming. Evidence-informed.\nEnvironment-focused.", ...BLOCK_PRESETS["Body"], marginTop: 24 },
];
let blockIdCounter = 100;

export default function EstusSocialCreator() {
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
  const fileInputRef = useRef(null);
  const size = CANVAS_SIZES[canvasSize];
  const scale = Math.min(380 / size.w, 680 / size.h);
  const selected = blocks.find((b) => b.id === selectedId);

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

  const addBlock = useCallback((presetName) => {
    const preset = BLOCK_PRESETS[presetName];
    const newBlock = {
      id: String(++blockIdCounter),
      text:
        presetName === "Eyebrow" ? "LABEL" :
        presetName === "Hero Bold" ? "HEADLINE" :
        presetName === "Hero Accent" ? "ACCENT" :
        presetName === "Serif Subtitle" ? "Subtitle here." :
        presetName === "CTA Label" ? "BUTTON TEXT" :
        presetName === "Checklist Item" ? "Checklist item." :
        "Body text here.",
      ...preset,
      marginTop: 16,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  }, []);

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
      // Ensure all fonts used are loaded before drawing to canvas
      if (document.fonts) {
        const fontLoads = blocks.map((b) => {
          const style = b.italic ? "italic" : "normal";
          return document.fonts.load(`${style} ${b.weight} ${b.size}px ${FONTS[b.font]}`);
        });
        await Promise.all(fontLoads);
        await document.fonts.ready;
      }

      const canvas = document.createElement("canvas");
      canvas.width = size.w;
      canvas.height = size.h;
      const ctx = canvas.getContext("2d");

      // Background colour
      ctx.fillStyle = BRAND_COLORS[bgColor];
      ctx.fillRect(0, 0, size.w, size.h);

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
          ctx.fillStyle = OVERLAY_COLORS[overlayColor] || "#000000";
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

      measured.forEach((block) => {
        y += block.marginTop;

        const fontStyle = block.italic ? "italic" : "normal";
        const fontStr = `${fontStyle} ${block.weight} ${block.size}px ${FONTS[block.font]}`;
        ctx.font = fontStr;
        ctx.fillStyle = BRAND_COLORS[block.color];

        // CSS line-height centres the glyph in the line box with equal space above/below.
        // textBaseline "top" draws from the top of the em square, so we offset by half-leading
        // to match the visual position in the browser preview.
        const halfLeading = block.size * (block.lineHeight - 1) / 2;

        block.lines.forEach((line) => {
          // Re-set font in case any previous draw mutated ctx state
          ctx.font = fontStr;

          const lineW = measureLineWidth(line, block.spacingPx);

          let x;
          if (block.align === "left") x = padding;
          else if (block.align === "right") x = size.w - padding - lineW;
          else x = (size.w - lineW) / 2;

          const drawY = y + halfLeading;

          if (block.spacingPx !== 0) {
            let cx = x;
            for (const char of line) {
              ctx.fillText(char, cx, drawY);
              cx += ctx.measureText(char).width + block.spacingPx;
            }
          } else {
            ctx.fillText(line, x, drawY);
          }

          if (block.strikethrough && line) {
            drawStrike(ctx, block.strikeStyle, x, drawY, lineW, block.size, BRAND_COLORS[block.color]);
          }

          y += block.lh;
        });
      });

      const link = document.createElement("a");
      link.download = `estus-social-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export error:", e);
    }
    setExporting(false);
  }, [blocks, size, bgColor, bgImageObj, bgFit, bgPositionX, bgPositionY, bgBlur, overlayColor, overlayOpacity, padding, verticalAlign]);

  const applyTemplate = useCallback((name) => {
    if (name === "hero-statement") {
      setBlocks([
        { id: String(++blockIdCounter), text: "OCCUPATIONAL THERAPY", ...BLOCK_PRESETS["Eyebrow"], marginTop: 0 },
        { id: String(++blockIdCounter), text: "BEING\nYOURSELF", ...BLOCK_PRESETS["Hero Bold"], marginTop: 24 },
        { id: String(++blockIdCounter), text: "ISN'T THE\nPROBLEM.", ...BLOCK_PRESETS["Hero Accent"], marginTop: 0 },
        { id: String(++blockIdCounter), text: "It's the starting point.", ...BLOCK_PRESETS["Serif Subtitle"], marginTop: 24 },
        { id: String(++blockIdCounter), text: "Neuroaffirming. Evidence-informed.\nEnvironment-focused.", ...BLOCK_PRESETS["Body"], marginTop: 24 },
      ]);
    } else if (name === "quote-card") {
      setBlocks([
        { id: String(++blockIdCounter), text: "ESTUS HEALTH", ...BLOCK_PRESETS["Eyebrow"], marginTop: 0 },
        { id: String(++blockIdCounter), text: "Your brain isn't broken.\nThe system wasn't\nbuilt for you.", ...BLOCK_PRESETS["Serif Subtitle"], size: 44, marginTop: 40 },
        { id: String(++blockIdCounter), text: "www.estushealth.com", ...BLOCK_PRESETS["Body"], size: 18, color: "Mid Grey", marginTop: 48 },
      ]);
    } else if (name === "protocol-tip") {
      setBlocks([
        { id: String(++blockIdCounter), text: "PERFORMANCE LAB: PROTOCOLS", ...BLOCK_PRESETS["Eyebrow"], marginTop: 0 },
        { id: String(++blockIdCounter), text: "PROTOCOL #12", ...BLOCK_PRESETS["Hero Bold"], size: 64, marginTop: 24 },
        { id: String(++blockIdCounter), text: "THE 2-MINUTE\nRULE", ...BLOCK_PRESETS["Hero Accent"], size: 72, marginTop: 0 },
        { id: String(++blockIdCounter), text: "If it takes less than 2 minutes,\ndo it now. Don't add it to the list.", ...BLOCK_PRESETS["Body"], size: 22, color: "Cream", marginTop: 32 },
        { id: String(++blockIdCounter), text: "performancelab@estushealth.com", ...BLOCK_PRESETS["Body"], size: 16, color: "Mid Grey", marginTop: 40 },
      ]);
    } else if (name === "stat-callout") {
      setBlocks([
        { id: String(++blockIdCounter), text: "DID YOU KNOW?", ...BLOCK_PRESETS["Eyebrow"], color: "Estus Orange", marginTop: 0 },
        { id: String(++blockIdCounter), text: "70%", ...BLOCK_PRESETS["Hero Bold"], size: 160, color: "White", marginTop: 16 },
        { id: String(++blockIdCounter), text: "of late-diagnosed autistic adults\nreport burnout as their\nprimary presentation.", ...BLOCK_PRESETS["Body"], size: 26, color: "Cream", marginTop: 8 },
        { id: String(++blockIdCounter), text: "ESTUS HEALTH", ...BLOCK_PRESETS["Eyebrow"], marginTop: 48 },
      ]);
    } else if (name === "therapy-goals") {
      setBlocks([
        { id: String(++blockIdCounter), text: "OCCUPATIONAL THERAPY", ...BLOCK_PRESETS["Eyebrow"], align: "left", marginTop: 0 },
        { id: String(++blockIdCounter), text: "WHAT IS YOUR\nNEXT THERAPY\nGOAL?", ...BLOCK_PRESETS["Hero Bold"], size: 72, align: "left", marginTop: 20 },
        { id: String(++blockIdCounter), text: "Set a regular sleep schedule", ...BLOCK_PRESETS["Checklist Item"], marginTop: 36, strikethrough: true, strikeStyle: "straight" },
        { id: String(++blockIdCounter), text: "Build a sensory toolkit", ...BLOCK_PRESETS["Checklist Item"], marginTop: 12, strikethrough: true, strikeStyle: "wavy" },
        { id: String(++blockIdCounter), text: "Practice unmasking with safe people", ...BLOCK_PRESETS["Checklist Item"], marginTop: 12 },
        { id: String(++blockIdCounter), text: "Identify burnout triggers", ...BLOCK_PRESETS["Checklist Item"], marginTop: 12 },
        { id: String(++blockIdCounter), text: "Plan recovery time after socialising", ...BLOCK_PRESETS["Checklist Item"], marginTop: 12 },
        { id: String(++blockIdCounter), text: "Ask for accommodations at work", ...BLOCK_PRESETS["Checklist Item"], marginTop: 12 },
        { id: String(++blockIdCounter), text: "Schedule a self-care ritual weekly", ...BLOCK_PRESETS["Checklist Item"], marginTop: 12 },
      ]);
    }
    setSelectedId(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderPreviewBlock = (block) => {
    const text = block.uppercase ? block.text.toUpperCase() : block.text;
    const lines = text.split("\n");
    return (
      <div
        key={block.id}
        onClick={(e) => { e.stopPropagation(); setSelectedId((prev) => prev === block.id ? null : block.id); }}
        style={{
          marginTop: block.marginTop * scale,
          textAlign: block.align,
          cursor: "pointer",
          outline: selectedId === block.id ? "2px solid #E87A2E" : "2px solid transparent",
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
              color: BRAND_COLORS[block.color],
              letterSpacing: block.letterSpacing * scale * (block.size / 18),
              lineHeight: block.lineHeight,
              whiteSpace: "pre",
            }}
          >
            <span style={{ position: "relative", display: "inline-block" }}>
              {line || " "}
              {block.strikethrough && line && (
                <StrikeOverlay
                  variant={block.strikeStyle}
                  color={BRAND_COLORS[block.color]}
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
                background: canvasSize === name ? "#E87A2E" : "#333",
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
            background: BRAND_COLORS[bgColor],
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
                  backgroundColor: OVERLAY_COLORS[overlayColor] || "#000000",
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
              background: exporting ? "#666" : "#E87A2E",
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
          <SectionLabel>Templates</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            {[
              ["hero-statement", "Hero Statement"],
              ["quote-card", "Quote Card"],
              ["protocol-tip", "Protocol Tip"],
              ["stat-callout", "Stat Callout"],
              ["therapy-goals", "Therapy Goals"],
            ].map(([key, label]) => (
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
            <ColorPicker value={bgColor} onChange={setBgColor} />
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
                      style={{ padding: "4px 10px", fontSize: 11, background: bgFit === f ? "#E87A2E" : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", textTransform: "capitalize" }}
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
                  {Object.entries(OVERLAY_COLORS).map(([name, hex]) => (
                    <button
                      key={name}
                      title={name}
                      onClick={() => setOverlayColor(name)}
                      style={{ width: 22, height: 22, borderRadius: 3, background: hex, border: overlayColor === name ? "2px solid #E87A2E" : "1px solid #555", cursor: "pointer", padding: 0 }}
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
            {Object.keys(BLOCK_PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => addBlock(name)}
                style={{ padding: "8px 6px", fontSize: 11, fontWeight: 500, background: "#2a2a2a", color: "#ccc", border: "1px solid #444", borderRadius: 4, cursor: "pointer" }}
              >
                + {name}
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
                  background: selectedId === b.id ? "#E87A2E22" : "#222",
                  border: selectedId === b.id ? "1px solid #E87A2E" : "1px solid #333",
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
                <select value={selected.font} onChange={(e) => updateBlock(selected.id, { font: e.target.value })} style={selectStyle}>
                  {Object.keys(FONTS).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Row>
              <Row label="Size">
                <RangeInput value={selected.size} min={10} max={200} onChange={(v) => updateBlock(selected.id, { size: v })} />
              </Row>
              <Row label="Weight">
                <select value={selected.weight} onChange={(e) => updateBlock(selected.id, { weight: Number(e.target.value) })} style={selectStyle}>
                  {[300, 400, 500, 600, 700].map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Row>
              <Row label="Color">
                <ColorPicker value={selected.color} onChange={(v) => updateBlock(selected.id, { color: v })} />
              </Row>
              <Row label="Align">
                <div style={{ display: "flex", gap: 4 }}>
                  {["left", "center", "right"].map((a) => (
                    <button
                      key={a}
                      onClick={() => updateBlock(selected.id, { align: a })}
                      style={{ padding: "4px 10px", fontSize: 11, background: selected.align === a ? "#E87A2E" : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", textTransform: "capitalize" }}
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
                  <ToggleBtn active={selected.uppercase} onClick={() => updateBlock(selected.id, { uppercase: !selected.uppercase })}>ABC</ToggleBtn>
                  <ToggleBtn active={selected.italic} onClick={() => updateBlock(selected.id, { italic: !selected.italic })}><em>I</em></ToggleBtn>
                  <ToggleBtn active={!!selected.strikethrough} onClick={() => updateBlock(selected.id, { strikethrough: !selected.strikethrough })}><span style={{ textDecoration: "line-through" }}>S</span></ToggleBtn>
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
                          background: (selected.strikeStyle || "straight") === s ? "#E87A2E" : "#333",
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
                  {Object.entries(BLOCK_PRESETS).map(([name, preset]) => (
                    <button
                      key={name}
                      onClick={() => updateBlock(selected.id, { ...preset })}
                      style={{ padding: "3px 8px", fontSize: 10, background: "#2a2a2a", color: "#999", border: "1px solid #444", borderRadius: 3, cursor: "pointer" }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
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
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: "#E87A2E", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, fontFamily: "'Oswald', sans-serif", ...style }}>
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 100, accentColor: "#E87A2E" }} />
      <span style={{ fontSize: 11, color: "#aaa", minWidth: 32, textAlign: "right" }}>{typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : value}</span>
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {Object.entries(BRAND_COLORS).map(([name, hex]) => (
        <button
          key={name}
          title={name}
          onClick={() => onChange(name)}
          style={{ width: 18, height: 18, borderRadius: 3, background: hex, border: value === name ? "2px solid #E87A2E" : hex === "#000000" || hex === "#1A1A1A" ? "1px solid #555" : "1px solid #333", cursor: "pointer", padding: 0 }}
        />
      ))}
    </div>
  );
}

function MiniBtn({ children, onClick, danger, active }) {
  const bg = danger ? "#4a2020" : active ? "#E87A2E" : "#333";
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

function ToggleBtn({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "4px 10px", fontSize: 11, background: active ? "#E87A2E" : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
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
