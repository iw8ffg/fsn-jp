import React, { useEffect, useRef, useState } from 'react';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useUiStore } from '@renderer/state/uiStore';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import { useSearchHitsStore } from '@renderer/state/searchHitsStore';
import { joinSegments } from '@renderer/util/paths';

export function SearchBar() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  // activeId is React state (not a ref) so that the Zustand selector
  // re-subscribes after a new search id is issued. With a ref, the selector
  // identity didn't change and newly-arriving hits weren't reflected until
  // some unrelated state updated.
  const [activeId, setActiveId] = useState<string | null>(null);
  const hits = useSearchHitsStore(s => activeId ? s.byId.get(activeId) ?? [] : []);
  const root = useFsStore(s => s.root);

  // Ctrl+F focus
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setQ(''); setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Mirror activeId in a ref so the debounce effect can read the
  // most-recent id for cancellation without depending on `activeId`
  // (which would re-trigger the effect immediately after setActiveId).
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // debounce
  useEffect(() => {
    if (!root) return;
    const handle = setTimeout(async () => {
      if (!q || q.length < 2) return;
      const prevId = activeIdRef.current;
      if (prevId) {
        await fsn.searchCancel(prevId);
        // Drop stale hits for the previous id so memory doesn't grow.
        useSearchHitsStore.getState().clear(prevId);
      }
      const id = crypto.randomUUID();
      setActiveId(id);
      try { await unwrap(fsn.search(root, q, id)); }
      catch (err) { useUiStore.getState().pushToast('error', String(err)); }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, root]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder="Search… (Ctrl+F)"
        onFocus={() => setOpen(true)}
        style={{
          width: 220, height: 28, padding: '0 8px',
          background: '#0f1622', color: '#cfd8dc', border: '1px solid #2a3a55', borderRadius: 4,
        }}
      />
      {open && q.length >= 2 && (
        <div style={{
          position: 'absolute', top: 32, right: 0, width: 360, maxHeight: 320, overflowY: 'auto',
          background: '#0f1622', border: '1px solid #2a3a55', borderRadius: 4, zIndex: 20,
        }}>
          {hits.slice(0, 100).map(h => (
            <div key={h.path} style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #1f2a3d' }}
                 onClick={async () => {
                   // expand parents up to hit
                   const segments = h.path.split('/').filter(Boolean);
                   const acc: string[] = [];
                   for (const s of segments) {
                     acc.push(s);
                     const partial = joinSegments(acc);
                     if (useFsStore.getState().nodes.has(partial)) {
                       useFsStore.getState().setExpanded(partial, true);
                     }
                   }
                   useCameraStore.getState().setFocus(h.path);
                   setOpen(false);
                 }}>
              <div style={{ color: '#cfd8dc', fontFamily: 'monospace' }}>{h.name}</div>
              <div style={{ color: '#7da4d8', fontSize: 11 }}>{h.parentPath}</div>
            </div>
          ))}
          {hits.length === 0 && <div style={{ padding: 10, color: '#7da4d8' }}>searching…</div>}
        </div>
      )}
    </div>
  );
}
