import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('fsn', {
  ping: () => 'pong',
});
