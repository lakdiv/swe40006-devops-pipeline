const express = require('express');
const db = require('./db');
const { register, metricsMiddleware } = require('./metrics');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

const VERSION = process.env.APP_VERSION || 'dev';
const STYLES = `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>FixLog</title>
<style>
  :root { --ink:#16202E; --muted:#5A6678; --line:#E2E6EC; --accent:#3B6FD4; --bg:#F4F6F8; }
  * { box-sizing: border-box; }
  body {
    max-width: 760px; margin: 0 auto; padding: 48px 24px;
    background: var(--bg); color: var(--ink); font-size: 16px; line-height: 1.5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  h1 { font-size: 34px; font-weight: 600; letter-spacing: -0.5px; margin: 0 0 4px; }
  h1 + p { color: var(--muted); margin: 0 0 28px; }

  form[data-testid="new-request"] { display: flex; gap: 10px; margin: 0 0 28px; }
  input {
    flex: 1; padding: 11px 14px; font: inherit; color: var(--ink);
    background: #fff; border: 1px solid var(--line); border-radius: 8px;
  }
  input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59,111,212,.15); }
  button[data-testid="submit"] {
    padding: 11px 20px; font: inherit; font-weight: 500; cursor: pointer;
    color: #fff; background: var(--accent); border: 1px solid var(--accent); border-radius: 8px;
  }
  button[data-testid="submit"]:hover { background: #2F5CB3; border-color: #2F5CB3; }

  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  li {
    display: flex; align-items: center; gap: 10px;
    background: #fff; padding: 15px 18px;
    border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 10px;
  }
  span[data-testid="asset"] { font-weight: 600; }
  span[data-testid="description"] { color: var(--muted); }
  em[data-testid="status"] {
    font-style: normal; font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .5px; color: #8A5D0E; background: #FFF4DF;
    padding: 4px 10px; border-radius: 999px;
  }
  li > form { display: block !important; margin-left: auto; }
  button[data-testid="delete"] {
    padding: 7px 14px; font: inherit; font-size: 14px; cursor: pointer;
    color: var(--muted); background: #fff; border: 1px solid var(--line); border-radius: 7px;
  }
  button[data-testid="delete"]:hover { color: #C0453C; background: #FDF2F1; border-color: #E7B5B1; }

  footer {
    display: block; margin-top: 36px; padding-top: 18px; border-top: 1px solid var(--line);
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 12px; color: #9AA4B2; word-break: break-all;
  }
</style>`;

app.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM requests ORDER BY id DESC');
    const items = rows.map(r => `
      <li data-testid="request">
        <span data-testid="asset">${r.asset}</span> &mdash;
        <span data-testid="description">${r.description}</span>
        <em data-testid="status">${r.status}</em>
        <form method="POST" action="/requests/${r.id}/delete" style="display:inline">
          <button type="submit" data-testid="delete">Delete</button>
        </form>
      </li>`).join('');

        res.send(`${STYLES}<h1>FixLog</h1>
    
      <p>Maintenance request tracker</p>
      <form method="POST" action="/requests" data-testid="new-request">
        <input name="asset" placeholder="Asset" data-testid="asset-input" required>
        <input name="description" placeholder="What's wrong" data-testid="description-input" required>
        <button type="submit" data-testid="submit">Log request</button>
      </form>
      <ul data-testid="request-list">${items || '<li data-testid="empty">No requests yet</li>'}</ul>
      <footer>version: ${VERSION}</footer>`);
  } catch (err) {
    res.status(500).send('<h1>FixLog</h1><p>Service unavailable</p>');
  }
});

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', version: VERSION });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.post('/requests', async (req, res) => {
  const { asset, description } = req.body;
  if (!asset || !description) return res.redirect('/');
  try {
    await db.query('INSERT INTO requests (asset, description) VALUES ($1, $2)', [asset, description]);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Could not save the request');
  }
});

app.post('/requests/:id/delete', async (req, res) => {
  try {
    await db.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Could not delete the request');
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM requests ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'database error' });
  }
});

app.post('/api/requests', async (req, res) => {
  const { asset, description } = req.body;
  if (!asset || !description) {
    return res.status(400).json({ error: 'asset and description are required' });
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO requests (asset, description) VALUES ($1, $2) RETURNING *',
      [asset, description]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'database error' });
  }
});

app.delete('/api/requests/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'database error' });
  }
});

module.exports = app;
