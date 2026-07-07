"use client";

import { useState } from "react";
import { SectionLabel, MiniBtn, RenamableLabel } from "./common";
import { layerDisplayName, isOffCanvas } from "../../lib/templates";
import { cssBackground, solidColor } from "../../lib/constants";

// Layer list, displayed top-first (render order is bottom→top). Rows support
// click select / shift multi-select, double-click rename, drag reorder,
// visibility and lock toggles, and an off-canvas recovery badge.
export default function LayersPanel({
  layers,
  canvas,
  selectedIds,
  onSelect,
  onRename,
  onReorderTo,
  onToggleVisible,
  onToggleLock,
  onRecenter,
  accent,
}) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const display = [...layers].reverse();

  const handleDrop = (targetId) => {
    if (dragId && targetId && dragId !== targetId) onReorderTo(dragId, targetId);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel accent={accent}>Layers ({layers.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {display.map((l) => {
          const selected = selectedIds.includes(l.id);
          const off = isOffCanvas(l, canvas);
          return (
            <div
              key={l.id}
              draggable
              onDragStart={() => setDragId(l.id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(l.id); }}
              onDragLeave={() => setOverId((v) => (v === l.id ? null : v))}
              onDrop={() => handleDrop(l.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onClick={(e) => {
                if (e.shiftKey) onSelect(selected ? selectedIds.filter((id) => id !== l.id) : [...selectedIds, l.id]);
                else onSelect([l.id]);
              }}
              style={{
                padding: "5px 6px",
                fontSize: 11,
                background: selected ? `${accent}22` : "#222",
                border: selected ? `1px solid ${accent}` : overId === l.id && dragId !== l.id ? "1px dashed #888" : "1px solid #333",
                borderRadius: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: l.visible ? "#ccc" : "#666",
                opacity: dragId === l.id ? 0.4 : 1,
              }}
            >
              <LayerIcon layer={l} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                <RenamableLabel
                  value={l.name || ""}
                  placeholder={layerDisplayName(l)}
                  onRename={(name) => onRename(l.id, name)}
                  style={{ flex: 1, textDecoration: l.type === "text" && l.strikethrough ? "line-through" : "none" }}
                />
              </div>
              {off && (
                <MiniBtn title="Layer is off-canvas — click to bring back" onClick={(e) => { e.stopPropagation(); onRecenter(l.id); }} danger>
                  ⚠
                </MiniBtn>
              )}
              <MiniBtn title={l.visible ? "Hide" : "Show"} onClick={(e) => { e.stopPropagation(); onToggleVisible(l.id); }} active={false}>
                {l.visible ? "👁" : "–"}
              </MiniBtn>
              <MiniBtn title={l.locked ? "Unlock" : "Lock"} onClick={(e) => { e.stopPropagation(); onToggleLock(l.id); }} active={l.locked}>
                {l.locked ? "🔒" : "🔓"}
              </MiniBtn>
            </div>
          );
        })}
        {!layers.length && <div style={{ fontSize: 11, color: "#666", padding: 8, textAlign: "center" }}>No layers yet — add text, images or shapes.</div>}
      </div>
    </div>
  );
}

function LayerIcon({ layer }) {
  const box = { width: 18, height: 18, borderRadius: 3, flexShrink: 0, border: "1px solid #444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#999", overflow: "hidden", background: "#1a1a1a" };
  if (layer.type === "image" && layer.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <div style={box}><img src={layer.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  }
  if (layer.type === "shape") {
    const fill = layer.fill && layer.fill !== "none" ? cssBackground(layer.fill) : "transparent";
    return (
      <div style={box}>
        <div style={{ width: 10, height: layer.shape === "line" ? 3 : 10, background: fill, borderRadius: layer.shape === "ellipse" ? "50%" : layer.shape === "pill" ? 5 : 1, border: layer.stroke && layer.stroke !== "none" ? `1px solid ${solidColor(layer.stroke)}` : "none" }} />
      </div>
    );
  }
  return <div style={box}>T</div>;
}
