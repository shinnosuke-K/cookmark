import { Serwist } from "serwist";
import type { PrecacheEntry } from "serwist";

// Minimal service worker: precache the build output only, so the app is
// installable as a PWA. No runtime caching / offline strategy — the app
// requires network access anyway (Instagram embeds, Supabase), and the
// product principle is "fresh on open", not offline support.
const sw = self as unknown as {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: sw.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
});

serwist.addEventListeners();
