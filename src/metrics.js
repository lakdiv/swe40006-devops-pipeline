const client = require('prom-client');

const register = new client.Registry();
register.setDefaultLabels({ app: 'fixlog' });
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'fixlog_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpDuration = new client.Histogram({
  name: 'fixlog_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const labels = { method: req.method, route, status: res.statusCode };
    end(labels);
    httpRequests.inc(labels);
  });
  next();
}

module.exports = { register, metricsMiddleware };