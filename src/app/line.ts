import { create } from 'zustand';
import { platform } from '../lib/platform';
import { LINES, rememberedLine, type BusinessLine } from '../core/lines';

/**
 * Which line of business this device last chose at the front door.
 *
 * Kept on the device, not the profile: it is a convenience for skipping the
 * door, the same kind of thing as the theme, and a signed-out visitor has one
 * too. Only a live line is ever remembered (see core/lines).
 */
const STORAGE_KEY = 'beezy.line';

interface LineState {
  /** Null until storage is read, or when nothing usable was stored. */
  line: BusinessLine | null;
  /** False until storage has been read back. The launch route waits on it. */
  loaded: boolean;
  choose: (line: BusinessLine) => void;
}

export const useLine = create<LineState>((set) => ({
  line: null,
  loaded: false,
  choose(line) {
    platform.haptics.selection();
    if (!LINES[line].live) return;
    set({ line });
    void platform.storage.set(STORAGE_KEY, line);
  },
}));

void platform.storage.get(STORAGE_KEY).then((stored) => {
  // A choice made while storage was being read wins over the stored one.
  if (useLine.getState().line) return useLine.setState({ loaded: true });
  useLine.setState({ line: rememberedLine(stored), loaded: true });
});
