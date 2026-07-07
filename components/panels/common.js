"use client";

import { useState } from "react";
import { cssBackground, solidColor, isGradient } from "../../lib/constants";

export const selectStyle = {
  background: "#222",
  color: "#eee",
  border: "1px solid #444",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  maxWidth: 150,
};

export function SectionLabel({ children, accent = "#E87A2E", style }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, fontFamily: "'Oswald', sans-serif", ...style }}>
      {children}
    </div>
  );
}

export function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
      <span style={{ fontSize: 11, color: "#888", minWidth: 58, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", minWidth: 0 }}>{children}</div>
    </div>
  );
}

// Range input with transient-friendly semantics: onChange fires per move
// (parent applies it as a transient doc update); onEnd fires when the
// gesture finishes so the parent can commit one history entry.
export function RangeInput({ value, min, max, step = 1, onChange, onEnd, width = 96 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onEnd}
        onKeyUp={onEnd}
        onBlur={onEnd}
        style={{ width, accentColor: "#E87A2E" }}
      />
      <span style={{ fontSize: 11, color: "#aaa", minWidth: 30, textAlign: "right" }}>
        {typeof value === "number" && value % 1 !== 0 ? value.toFixed(2).replace(/0$/, "") : value}
      </span>
    </div>
  );
}

// Brand swatches plus a free hex picker. `value` may be a palette name or a
// raw hex string.
export function ColorPicker({ value, onChange, onEnd, colors, accent, allowNone = false }) {
  const isHexValue = typeof value === "string" && value.startsWith("#");
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
      {allowNone && (
        <button
          title="None"
          onClick={() => { onChange("none"); onEnd && onEnd(); }}
          style={{
            width: 18, height: 18, borderRadius: 3, padding: 0, cursor: "pointer",
            background: "linear-gradient(135deg, #333 45%, #f55 48%, #f55 52%, #333 55%)",
            border: value === "none" ? `2px solid ${accent}` : "1px solid #555",
          }}
        />
      )}
      {Object.keys(colors).map((name) => {
        const hex = colors[name];
        return (
          <button
            key={name}
            title={name}
            onClick={() => { onChange(name); onEnd && onEnd(); }}
            style={{
              width: 18, height: 18, borderRadius: 3, padding: 0, cursor: "pointer",
              background: cssBackground(name),
              border: value === name ? `2px solid ${accent}` : hex === "#000000" || hex === "#1A1A1A" ? "1px solid #555" : "1px solid #333",
            }}
          />
        );
      })}
      <label
        title="Custom colour"
        style={{
          width: 18, height: 18, borderRadius: 3, cursor: "pointer", overflow: "hidden", position: "relative",
          border: isHexValue ? `2px solid ${accent}` : "1px solid #555",
          background: isHexValue ? value : "conic-gradient(#f55, #ff5, #5f5, #5ff, #55f, #f5f, #f55)",
        }}
      >
        <input
          type="color"
          value={isHexValue ? value : solidColor(value === "none" ? "#888888" : value)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onEnd}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
        />
      </label>
    </div>
  );
}

export function ToggleBtn({ children, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ padding: "4px 10px", fontSize: 11, background: active ? "#E87A2E" : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

export function MiniBtn({ children, onClick, danger, active, title }) {
  const bg = danger ? "#4a2020" : active ? "#E87A2E" : "#333";
  const color = danger ? "#f88" : active ? "#fff" : "#aaa";
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: 20, height: 20, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", background: bg, color, border: "none", borderRadius: 3, cursor: "pointer", padding: 0, flexShrink: 0 }}
    >
      {children}
    </button>
  );
}

export function PanelBtn({ children, onClick, style, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ padding: "8px 6px", fontSize: 11, fontWeight: 500, background: "#2a2a2a", color: "#ccc", border: "1px solid #444", borderRadius: 4, cursor: "pointer", ...style }}
    >
      {children}
    </button>
  );
}

// Editable-on-double-click text used for layer renaming.
export function RenamableLabel({ value, placeholder, onRename, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onRename(draft.trim()); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#111", color: "#eee", border: "1px solid #555", borderRadius: 3, fontSize: 11, padding: "1px 4px", width: "100%", ...style }}
      />
    );
  }
  return (
    <span
      onDoubleClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...style }}
      title="Double-click to rename"
    >
      {value || placeholder}
    </span>
  );
}
