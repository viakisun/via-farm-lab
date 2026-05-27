// Prometheus metrics endpoint. Default Node + process collectors plus
// a request-counter that increments on every HTTP request.
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'sim_bff_' });

const httpRequestsTotal = new client.Counter({
  name: 'sim_bff_http_requests_total',
  help: 'Total number of HTTP requests handled.',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'sim_bff_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const metricsRoutes: FastifyPluginAsync = (app: FastifyInstance) => {
  app.addHook('onResponse', (req, reply, done) => {
    const route = req.routeOptions.url ?? req.url;
    const status = String(reply.statusCode);
    const method = req.method;
    httpRequestsTotal.inc({ method, route, status });
    httpRequestDurationSeconds.observe({ method, route, status }, reply.elapsedTime / 1000);
    done();
  });

  app.get('/metrics', (_req, reply) => {
    void reply.header('content-type', registry.contentType);
    return registry.metrics();
  });

  return Promise.resolve();
};
