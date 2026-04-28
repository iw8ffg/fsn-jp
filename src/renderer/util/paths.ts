/**
 * Shared path helpers for the renderer. Paths in this app use forward slashes
 * everywhere (drive letter `C:/...` on Windows, leading `/` on POSIX).
 */

/**
 * Returns the parent directory portion of a forward-slash path. For drive
 * roots like `C:/foo` it returns `C:/`; for top-level POSIX paths like
 * `/foo` it returns `/`. Behavior matches the previous local helpers in
 * SceneController.
 */
export function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1);
  return p.slice(0, i);
}

/**
 * Reassembles a forward-slash path from non-empty segments. If the first
 * segment ends with `:` (a Windows drive letter like `C:`), the path is
 * built as `C:/seg/seg`; otherwise it is rooted at `/`.
 */
export function joinSegments(segments: string[]): string {
  if (segments.length === 0) return '';
  const head = segments[0]!;
  if (head.endsWith(':')) {
    return segments.length === 1 ? head + '/' : head + '/' + segments.slice(1).join('/');
  }
  return '/' + segments.join('/');
}
