import React from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { Breadcrumb } from './Breadcrumb';
import { SearchBar } from './SearchBar';

export function Toolbar() {
  const hiddenVisible = useUiStore(s => s.hiddenVisible);
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 44,
      background: 'rgba(10,14,20,0.85)', borderBottom: '1px solid #1f2a3d',
      display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12, zIndex: 10,
    }}>
      <strong style={{ color: '#7da4d8' }}>FSN-JP</strong>
      <Breadcrumb />
      <div style={{ flex: 1 }} />
      <SearchBar />
      <label style={{ color: '#cfd8dc', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="checkbox" checked={hiddenVisible} onChange={() => useUiStore.getState().toggleHidden()} />
        hidden
      </label>
    </div>
  );
}
