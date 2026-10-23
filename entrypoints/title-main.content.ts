import { defineContentScript } from 'wxt/utils/define-content-script';
import { CONTENT_MATCHES, EVT_LOCK, EVT_READY, EVT_UNLOCK } from '../lib/core';

/**
 * MAIN world (the page's own JS context). While the ISOLATED script holds a
 * custom title, page writes to `document.title` are dropped instead of
 * overwritten after the fact, so SPA updates and unread counters such as
 * "(3) Inbox" never reach the tab strip. The last blocked value is replayed
 * when the lock is released, restoring the page's current native title.
 *
 * No extension APIs exist in this world; it only talks to the ISOLATED script
 * through CustomEvents on `document`.
 */
export default defineContentScript({
  matches: CONTENT_MATCHES,
  runAt: 'document_start',
  allFrames: false,
  world: 'MAIN',

  main() {
    const installed = Symbol.for('tab-renamer.title-guard');
    const win = window as unknown as Record<symbol, boolean>;
    if (win[installed]) {
      // Re-injected into an already patched page: just re-handshake.
      document.dispatchEvent(new CustomEvent(EVT_READY));
      return;
    }
    Object.defineProperty(window, installed, { value: true });

    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
    const nativeSet = descriptor?.set;
    if (descriptor == null || nativeSet == null) return;

    let locked = false;
    let blocked: string | undefined;

    Object.defineProperty(Document.prototype, 'title', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(this: Document, value: string) {
        if (locked && this === document) {
          blocked = String(value);
          return;
        }
        nativeSet.call(this, value);
      },
    });

    document.addEventListener(EVT_LOCK, () => {
      locked = true;
    });
    document.addEventListener(EVT_UNLOCK, () => {
      if (!locked) return;
      locked = false;
      if (blocked !== undefined) {
        const value = blocked;
        blocked = undefined;
        nativeSet.call(document, value);
      }
    });

    document.dispatchEvent(new CustomEvent(EVT_READY));
  },
});
