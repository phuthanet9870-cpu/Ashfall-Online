// Ashfall Online — site config. Set `ws` to your Cloudflare Worker address after deploying it, e.g.
//   ws: 'wss://ashfall-online.YOUR-NAME.workers.dev/ws'
// Leave it empty when the game is served by the Node server itself (same host → /ws).
window.ASHFALL_CFG = {
  ws: '',
  noBots: true   // online build: no fake players in towns/fields (PvP / guild war / world boss keep their AI teams)
};
