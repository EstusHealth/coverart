"use client";

import { useState } from "react";
import { SectionLabel, Row, ColorPicker, PanelBtn, ToggleBtn } from "./common";
import { BRANDS, BLOCK_PRESETS, TEMPLATES } from "../../lib/constants";

// Document-level controls: brand, templates, canvas, and the add-layer
// palette. Layer list and inspector are separate panels composed by the
// parent alongside this one.
export default function Sidebar({
  brand,
  onSwitchBrand,
  onApplyTemplate,
  background,
  onBackground,
  onBackgroundEnd,
  canvasW,
  canvasH,
  onCustomSize,
  showSafeZone,
  onToggleSafeZone,
  onAddText,
  onUploadImage,
  onSetBackgroundImage,
  onAddLogo,
  hasLogo,
  onChangeLogo,
  onAddShape,
  accent,
}) {
  const [w, setW] = useState(canvasW);
  const [h, setH] = useState(canvasH);
  const sizeInput = { width: 56, background: "#222", color: "#eee", border: "1px solid #444", borderRadius: 4, padding: "3px 6px", fontSize: 12 };

  return (
    <>
      <SectionLabel accent={accent}>Brand</SectionLabel>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {Object.keys(BRANDS).map((b) => (
          <button
            key={b}
            onClick={() => onSwitchBrand(b)}
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

      <SectionLabel accent={accent}>Templates</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <PanelBtn key={key} onClick={() => onApplyTemplate(key)}>{t.label}</PanelBtn>
        ))}
      </div>

      <SectionLabel accent={accent}>Canvas</SectionLabel>
      <Row label="Background">
        <ColorPicker value={background} onChange={onBackground} onEnd={onBackgroundEnd} colors={BRANDS[brand].colors} accent={accent} />
      </Row>
      <Row label="Size">
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="number" value={w} min={200} max={4000} onChange={(e) => setW(e.target.value)} style={sizeInput} />
          <span style={{ color: "#666", fontSize: 11 }}>×</span>
          <input type="number" value={h} min={200} max={4000} onChange={(e) => setH(e.target.value)} style={sizeInput} />
          <PanelBtn
            style={{ padding: "3px 8px", fontSize: 10 }}
            onClick={() => {
              const nw = Math.max(200, Math.min(4000, Number(w) || canvasW));
              const nh = Math.max(200, Math.min(4000, Number(h) || canvasH));
              setW(nw);
              setH(nh);
              onCustomSize(nw, nh);
            }}
          >
            Set
          </PanelBtn>
        </div>
      </Row>
      <Row label="Safe zone">
        <ToggleBtn active={showSafeZone} onClick={onToggleSafeZone}>{showSafeZone ? "On" : "Off"}</ToggleBtn>
      </Row>

      <SectionLabel accent={accent} style={{ marginTop: 20 }}>Add text</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
        {Object.keys(BLOCK_PRESETS).map((name) => (
          <PanelBtn key={name} onClick={() => onAddText(name)}>+ {name}</PanelBtn>
        ))}
      </div>

      <SectionLabel accent={accent}>Add images</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        <PanelBtn onClick={onUploadImage} style={{ borderStyle: "dashed", padding: "12px 6px" }}>+ Image</PanelBtn>
        <PanelBtn onClick={onSetBackgroundImage} style={{ borderStyle: "dashed", padding: "12px 6px" }}>+ Background</PanelBtn>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <PanelBtn onClick={onAddLogo} style={{ flex: 1 }}>{hasLogo ? "+ Logo" : "+ Logo (upload once)"}</PanelBtn>
        {hasLogo && <PanelBtn onClick={onChangeLogo} title="Replace the saved logo" style={{ padding: "8px 10px" }}>↺</PanelBtn>}
      </div>

      <SectionLabel accent={accent}>Add shapes</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
        {[["rect", "▭"], ["ellipse", "◯"], ["pill", "⬭"], ["line", "—"]].map(([shape, icon]) => (
          <PanelBtn key={shape} title={shape} onClick={() => onAddShape(shape)} style={{ fontSize: 14 }}>{icon}</PanelBtn>
        ))}
      </div>
    </>
  );
}
