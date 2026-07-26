const mod = require('../dist/src/serverless');

module.exports = async (req, res) => {
  try {
    await mod.handler(req, res);
  } catch (e) {
    console.error('HANDLER_ERROR:', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message, stack: e.stack, name: e.name }));
  }
};
