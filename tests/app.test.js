const request = require('supertest');
const app = require('../src/app');

test('health endpoint returns ok', async () => {
  const res = await request(app).get('/health');
  expect(res.statusCode).toBe(200);
  expect(res.body.status).toBe('ok');
});

test('can create and list an item', async () => {
  const created = await request(app).post('/api/items').send({ title: 'Buy milk' });
  expect(created.statusCode).toBe(201);
  expect(created.body.title).toBe('Buy milk');

  const list = await request(app).get('/api/items');
  expect(list.body.length).toBeGreaterThan(0);
});

test('rejects an item with no title', async () => {
  const res = await request(app).post('/api/items').send({});
  expect(res.statusCode).toBe(400);
});