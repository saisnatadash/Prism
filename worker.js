// Minimal Cloudflare Worker that just serves the built frontend's static
// files (frontend/dist, configured via wrangler.toml's [assets] block).
// No custom logic needed - the React app is a client-side SPA that talks
// to the backend over HTTPS directly from the browser.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
