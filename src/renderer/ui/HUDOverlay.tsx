import React from 'react';
import { useFsStore } from '@renderer/state/fsStore';

function fmt(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = size, i = -1;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function HUDOverlay() {
  const hover = useFsStore(s => s.hoverPath);
  const selected = useFsStore(s => s.selectedPath);
  // Selection wins over hover so the HUD persists when the cursor leaves
  // the selected mesh; hover is a transient secondary state.
  const path = selected ?? hover;
  const node = useFsStore(s => path ? s.nodes.get(path) : null);
  if (!node || !path) return null;
  const isSelected = selected === path;
  return (
    <div style={{
      position: 'absolute', bottom: 36, left: 12, padding: '10px 14px',
      background: 'rgba(10,14,20,0.85)', color: '#cfd8dc',
      border: '1px solid #2a3a55', borderRadius: 6, fontFamily: 'monospace',
      pointerEvents: 'none', minWidth: 220,
    }}>
      <div style={{ fontSize: 10, marginBottom: 4 }}>
        {isSelected
          ? <span style={{ color: '#5cd0e8' }}>● SELECTED</span>
          : <span style={{ color: '#7a8a9a' }}>▸ HOVER</span>}
      </div>
      <div style={{ color: '#7da4d8' }}>{node.kind.toUpperCase()}</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>{node.name}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{node.path}</div>
      {node.kind === 'file' && <div style={{ fontSize: 11, marginTop: 4 }}>size: {fmt(node.size)}</div>}
      <div style={{ fontSize: 11 }}>modified: {new Date(node.mtimeMs).toLocaleString()}</div>
    </div>
  );
}
