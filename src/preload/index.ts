import { contextBridge } from 'electron';

// NOTE: This is a STUB. The full FsnApi surface is wired in Plan Task 11.
// `window.fsn` is typed globally as FsnApi via src/shared/api.ts, but the
// methods declared there will throw "is not a function" in the renderer
// until Task 11 lands. Don't call them from renderer code yet.
contextBridge.exposeInMainWorld('fsn', {
  ping: () => 'pong',
});
