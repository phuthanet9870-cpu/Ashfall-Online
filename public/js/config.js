// Ashfall Online — site config. Set `ws` to your Cloudflare Worker address after deploying it, e.g.
//   ws: 'wss://ashfall-online.YOUR-NAME.workers.dev/ws'
// Leave it empty when the game is served by the Node server itself (same host → /ws).
window.ASHFALL_CFG = {
  ws: ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? '' : 'wss://ashfall-online.phuthanet9870.workers.dev/ws',
  sharedWorld: true,
  noBots: true   // online build: real players; monsters and guards remain server-controlled NPCs
};
