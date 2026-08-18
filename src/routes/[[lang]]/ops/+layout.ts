// convex-svelte is browser-only — disable SSR for this entire subtree.
// The server-side JWT guard in +layout.server.ts still runs normally.
export const ssr = false;
