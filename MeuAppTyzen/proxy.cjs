// proxy.cjs
const cors_proxy = require("cors-anywhere");

const host = "0.0.0.0";
const port = 8080;

cors_proxy.createServer({
  originWhitelist: [], // permite todas as origens
}).listen(port, host, () => {
  console.log(`🚀 CORS Anywhere rodando em http://${host}:${port}`);
});
