/**
 * Module-level singleton that tracks which lesson-slot IDs are currently
 * being generated.  Lives outside React so it persists across Next.js
 * client-side navigation.
 *
 * Components subscribe via useSyncExternalStore:
 *
 *   const generating = useSyncExternalStore(
 *     generationStore.subscribe,
 *     generationStore.getSnapshot,
 *     generationStore.getServerSnapshot,
 *   );
 */

type Listener = () => void;

let _snapshot = new Set<string>();
// One shared instance: React requires getServerSnapshot to return the same value
// every call ("The result of getServerSnapshot should be cached").
const _serverSnapshot: ReadonlySet<string> = new Set<string>();
const _listeners = new Set<Listener>();

function _notify() {
  // Create a new Set reference so useSyncExternalStore detects the change.
  _snapshot = new Set(_snapshot);
  _listeners.forEach((l) => l());
}

export const generationStore = {
  start(slotId: string) {
    if (!_snapshot.has(slotId)) {
      _snapshot = new Set(_snapshot);
      _snapshot.add(slotId);
      _listeners.forEach((l) => l());
    }
  },

  finish(slotId: string) {
    if (_snapshot.has(slotId)) {
      _snapshot = new Set(_snapshot);
      _snapshot.delete(slotId);
      _listeners.forEach((l) => l());
    }
  },

  isGenerating(slotId: string) {
    return _snapshot.has(slotId);
  },

  getSnapshot() {
    return _snapshot;
  },

  /** Nothing is generating during SSR. */
  getServerSnapshot() {
    return _serverSnapshot as Set<string>;
  },

  subscribe(listener: Listener) {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
