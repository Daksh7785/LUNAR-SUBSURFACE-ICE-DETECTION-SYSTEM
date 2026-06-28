import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';
import promClient from 'prom-client';
import apiRouter from './routes/api';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { env } from './config/env';
import { db } from './config/database';

export const app = express();
const PORT = env.PORT;

// Prometheus metrics collection
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'lunar_ice_' });

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000,
  message: { error: 'Too many requests, please try again later.' }
});

app.use(cors({
  origin: true, // Allow all origins but with proper credentials if needed
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10kb' }));
app.use(limiter);

// Healthcheck (liveness)
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Readiness check (checks database connection)
app.get('/api/v1/ready', async (req: Request, res: Response) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'READY', database: 'CONNECTED', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Readiness probe failed', { error: (err as Error).message });
    res.status(503).json({ status: 'DOWN', database: 'DISCONNECTED', timestamp: new Date().toISOString() });
  }
});

// Metrics Endpoint for Prometheus
app.get('/api/v1/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Mock Swagger Definitions
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Lunar Subsurface Ice Detection API',
    version: '1.0.0',
    description: 'API documentation for the Lunar Subsurface Ice Detection System microservices.'
  },
  servers: [{ url: '/api/v1' }],
  paths: {}
};

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount main API router
app.use('/api/v1', apiRouter);

// Global Error Handler
app.use(errorHandler);

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  logger.info('WebSocket client connected for real-time telemetry');
  
  // Send initial telemetry immediately
  const getTelemetry = () => ({
    timestamp: new Date().toISOString(),
    rover: {
      lat: -88.521 + (Math.random() - 0.5) * 0.001,
      lng: 45.05 + (Math.random() - 0.5) * 0.001,
      heading: (Math.random() * 360).toFixed(1),
      speedKmh: (1.2 + Math.random() * 0.5).toFixed(2),
    },
    battery: {
      percentage: (85 - Math.random() * 2).toFixed(1),
      voltage: (28.4 - Math.random() * 0.2).toFixed(2),
      solarGenerationW: (120 + Math.random() * 10).toFixed(1),
      consumptionW: (45 + Math.random() * 5).toFixed(1),
    },
    terrain: {
      slopeDegrees: (4.5 + Math.random() * 2).toFixed(1),
      boulderProximityM: (12.4 - Math.random() * 2).toFixed(1),
      surfaceRoughness: (0.12 + Math.random() * 0.03).toFixed(3),
    },
    radar: {
      cprValue: (1.45 + Math.random() * 0.2).toFixed(2),
      dopValue: (0.08 + Math.random() * 0.02).toFixed(2),
      iceFlag: true,
      dielectricConstant: (3.1 + Math.random() * 0.2).toFixed(2),
    },
    mission: {
      state: 'EXPLORING_PSR',
      activeTask: 'Subsurface Dielectric Profiling',
      signalStrengthDbm: -68 + Math.floor(Math.random() * 5),
    }
  });

  ws.send(JSON.stringify(getTelemetry()));

  // Broadcast every 2 seconds as required by specification
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(getTelemetry()));
    }
  }, 2000);

  ws.on('close', () => {
    clearInterval(interval);
    logger.info('WebSocket client disconnected');
  });
});

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/ws/telemetry') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

if (env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`Lunar Ice Backend & WebSocket service running on port ${PORT}`);
  });
}
