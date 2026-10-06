const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

beforeAll(async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      asset TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
});

beforeEach(async () => {
  await db.query('TRUNCATE requests RESTART IDENTITY');
});

afterAll(async () => {
  await db.pool.end();
});

describe('health', () => {
  test('reports ok and a connected database', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });
});

describe('requests API', () => {
  test('starts empty', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('creates a request and returns it', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({ asset: 'Air conditioner L2', description: 'Not cooling' });

    expect(res.statusCode).toBe(201);
    expect(res.body.asset).toBe('Air conditioner L2');
    expect(res.body.status).toBe('open');
    expect(res.body.id).toBeDefined();
  });

  test('persists a created request in the list', async () => {
    await request(app).post('/api/requests').send({ asset: 'Lift 3', description: 'Door sticking' });
    const list = await request(app).get('/api/requests');
    expect(list.body).toHaveLength(1);
    expect(list.body[0].description).toBe('Door sticking');
  });

  test('rejects a request with no asset', async () => {
    const res = await request(app).post('/api/requests').send({ description: 'Missing asset' });
    expect(res.statusCode).toBe(400);
  });

  test('rejects a request with no description', async () => {
    const res = await request(app).post('/api/requests').send({ asset: 'Boiler' });
    expect(res.statusCode).toBe(400);
  });

  test('deletes an existing request', async () => {
    const created = await request(app).post('/api/requests').send({ asset: 'Pump', description: 'Leaking' });
    const res = await request(app).delete(`/api/requests/${created.body.id}`);
    expect(res.statusCode).toBe(204);

    const list = await request(app).get('/api/requests');
    expect(list.body).toEqual([]);
  });

  test('returns 404 when deleting a request that does not exist', async () => {
    const res = await request(app).delete('/api/requests/9999');
    expect(res.statusCode).toBe(404);
  });
});

describe('home page', () => {
  test('renders the running version', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('FixLog');
    expect(res.text).toContain('version:');
  });
});