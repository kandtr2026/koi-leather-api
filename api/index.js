module.exports = async (req, res) => {
  try {
    const mod = require('../dist/src/serverless');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ handlerType: typeof mod.handler, keys: Object.keys(mod) }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message, stack: e.stack }));
  }
};
