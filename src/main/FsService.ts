import * as fs from 'node:fs/promises';
import type { DriveInfo, FsNode } from '@shared/types';

export class FsService {
  async listDrives(): Promise<DriveInfo[]> {
    const drives: DriveInfo[] = [];
    for (let code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
      const letter = String.fromCharCode(code) + ':';
      try {
        await fs.access(letter + '/');
        drives.push({ letter });
      } catch {
        // not present
      }
    }
    return drives;
  }
}
