// Minimal Server-Sent-Events broadcaster so every open admin session (any
// device/browser) finds out immediately when an appointment changes
// somewhere else, without adding a websocket dependency.
const clients = new Set();

function stream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n');
  clients.add(res);

  const keepAlive = setInterval(() => res.write(':ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
}

function broadcast(type, payload) {
  const data = JSON.stringify({ type, payload, at: Date.now() });
  for (const res of clients) {
    res.write(`event: appointments-changed\ndata: ${data}\n\n`);
  }
}

module.exports = { stream, broadcast };
