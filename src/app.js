const express = require('express');
const db = require('./db');
const { register, metricsMiddleware } = require('./metrics');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

const VERSION = process.env.APP_VERSION || 'dev';

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

    res.send(`<h1>FixLog</h1>
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