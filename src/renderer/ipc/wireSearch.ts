import { fsn } from './client';
import { useSearchHitsStore } from '@renderer/state/searchHitsStore';

export function wireSearch(): () => void {
  return fsn.onSearchResult((id, hits) => {
    useSearchHitsStore.getState().appendHits(id, hits);
  });
}
