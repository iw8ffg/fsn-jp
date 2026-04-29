import React from 'react';
import { useCameraStore } from '@renderer/state/cameraStore';
import { useFsStore } from '@renderer/state/fsStore';
import { useMarkersStore } from '@renderer/state/markersStore';
import { parentOf } from '@renderer/util/paths';

const ACCENT = '#b89770';
const TEXT = '#d8d4cc';
const BORDER = '#46505e';
const BTN_BG = '#2a2f38';
const BTN_BG_HOVER = '#3a4250';

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      font: 'bold 11px monospace', letterSpacing: 1.5,
      color: ACCENT, marginBottom: 6, marginTop: 14,
    }}>{children}</div>
  );
}

function PanelButton(props: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%', padding: '8px 12px', marginBottom: 6,
        background: props.disabled ? BTN_BG : (hover ? BTN_BG_HOVER : BTN_BG),
        border: `1px solid ${BORDER}`, color: props.disabled ? '#6a7080' : TEXT,
        fontFamily: 'monospace', fontSize: 12, textAlign: 'left',
        cursor: props.disabled ? 'default' : 'pointer',
      }}
    >{props.children}</button>
  );
}

export function SidePanel() {
  const flightSpeed = useCameraStore(s => s.flightSpeed);
  const zoomLevel = useCameraStore(s => s.zoomLevel);
  const focusPath = useCameraStore(s => s.focusPath);
  const selectedPath = useFsStore(s => s.selectedPath);
  const root = useFsStore(s => s.root);

  const current = focusPath ?? selectedPath;
  const canShowParent = !!current && current !== root;

  const onShowParent = () => {
    if (!current || current === root) return;
    useCameraStore.getState().setFocus(parentOf(current));
  };
  const onResetView = () => {
    if (root) useCameraStore.getState().setFocus(root);
  };

  return (
    <div style={{
      position: 'absolute', top: 44, left: 0, bottom: 24, width: 220,
      background: 'rgba(28,32,40,0.92)', borderRight: `1px solid ${BORDER}`,
      padding: '12px 14px', color: TEXT, fontFamily: 'monospace',
      boxSizing: 'border-box', zIndex: 9, overflowY: 'auto',
    }}>
      <div style={{
        font: 'bold 14px monospace', letterSpacing: 2, color: ACCENT,
        borderBottom: `1px solid ${BORDER}`, paddingBottom: 8,
      }}>FSN-JP</div>

      <SectionHeader>MOVEMENT</SectionHeader>
      <label style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>speed</span><span>{flightSpeed.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01}
          value={flightSpeed}
          onChange={(e) => useCameraStore.getState().setFlightSpeed(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: ACCENT }}
        />
      </label>
      <label style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>zoom</span><span>{zoomLevel.toFixed(0)}</span>
        </div>
        <input
          type="range" min={5} max={1000} step={1}
          value={zoomLevel}
          onChange={(e) => useCameraStore.getState().setZoomLevel(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: ACCENT }}
        />
      </label>

      <SectionHeader>PATH</SectionHeader>
      <PanelButton onClick={onShowParent} disabled={!canShowParent}>
        ↑ Show Parent
      </PanelButton>
      <PanelButton onClick={onResetView} disabled={!root}>
        ⌂ Reset View
      </PanelButton>

      <SectionHeader>MARKERS</SectionHeader>
      <MarkersSection />
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function MarkersSection() {
  // Subscribe via a stable selector. We project byId into a sorted-by-name
  // array; React re-renders only when byId reference changes (Map is replaced
  // immutably on add/remove in the store).
  const markers = useMarkersStore(s => Array.from(s.byId.values()));
  const selected = useFsStore(s => s.selectedPath);
  const focus = useCameraStore(s => s.focusPath);
  const candidate = selected ?? focus;
  const candidateNode = useFsStore(s => candidate ? s.nodes.get(candidate) ?? null : null);
  const alreadyMarked = !!candidate && markers.some(m => m.path === candidate);

  const onAdd = () => {
    if (!candidate || !candidateNode || alreadyMarked) return;
    const id = crypto.randomUUID();
    useMarkersStore.getState().add({ id, path: candidate, name: candidateNode.name });
  };
  const onRecall = (path: string) => useCameraStore.getState().setFocus(path);
  const onRemove = (id: string) => useMarkersStore.getState().remove(id);

  return (
    <>
      <PanelButton
        onClick={onAdd}
        disabled={!candidate || !candidateNode || alreadyMarked}
      >
        {alreadyMarked ? '✓ Marked' : '+ Add Marker'}
      </PanelButton>

      {markers.length === 0 ? (
        <div style={{ fontSize: 11, opacity: 0.55, fontStyle: 'italic', marginTop: 4 }}>
          no markers
        </div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {markers.map(m => (
            <MarkerRow
              key={m.id}
              name={m.name}
              path={m.path}
              onRecall={() => onRecall(m.path)}
              onRemove={() => onRemove(m.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function MarkerRow(props: {
  name: string;
  path: string;
  onRecall: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={props.path}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 6px', marginBottom: 2,
        background: hover ? BTN_BG_HOVER : 'transparent',
        border: `1px solid ${hover ? BORDER : 'transparent'}`,
        fontSize: 11,
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {truncate(props.name, 20)}
      </span>
      <RowButton onClick={props.onRecall} title="Recall camera">↪</RowButton>
      <RowButton onClick={props.onRemove} title="Remove marker" danger>×</RowButton>
    </div>
  );
}

function RowButton(props: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  danger?: boolean;
}) {
  const [hover, setHover] = React.useState(false);
  const baseColor = props.danger ? '#c98080' : TEXT;
  const hoverColor = props.danger ? '#ff8080' : ACCENT;
  return (
    <button
      onClick={props.onClick}
      title={props.title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'transparent',
        border: 'none',
        color: hover ? hoverColor : baseColor,
        fontFamily: 'monospace', fontSize: 13,
        cursor: 'pointer', padding: '0 4px',
        lineHeight: 1,
      }}
    >{props.children}</button>
  );
}
