const express = require('express');
const app = express();
app.use(express.json());

let items = [];
let nextId = 1;

app.get('/', (req, res) => {
  res.send('<h1>FixLog</h1><p>Maintenance request tracker — SWE40006 DevOps Pipeline Project</p>');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/items', (req, res) => {
  res.json(items);
});

app.post('/api/items', (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const item = { id: nextId++, title: req.body.title, done: false };
  items.push(item);
  res.status(201).json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = items.length;
  items = items.filter(item => item.id !== id);
  if (items.length === before) {
    return res.status(404).json({ error: 'not found' });
  }
  res.status(204).send();
});

module.exports = app;