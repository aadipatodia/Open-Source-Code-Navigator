import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copy text to the clipboard and expose which item was copied most recently.
 *
 * `copiedKey` lets one hook drive several copy buttons: pass a distinct key per
 * button and compare against it. It clears itself after `resetAfterMs`.
 */
export function useCopyToClipboard(resetAfterMs = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const copy = useCallback(
    async (text: string, key = 'default') => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setCopiedKey(null), resetAfterMs);
      } catch {
        // Clipboard access can be denied; there is nothing useful to recover.
      }
    },
    [resetAfterMs]
  );

  return { copy, copiedKey };
}
