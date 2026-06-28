import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/index';
import { setupTestDB, teardownTestDB } from '../setup';

describe('Analysis API', () => {
  let token: string;
  let projectId: string;
  let datasetId: string;

  beforeAll(async () => {
    await setupTestDB();

    // Create test user and get token
    const authRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'TestPass123!',
        fullName: 'Test User'
      });

    token = authRes.body.token;

    // Create test project
    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Project',
        craterName: 'Faustini',
        latitude: -88.5,
        longitude: 45.0
      });

    projectId = projectRes.body.projectId;

    // Upload test dataset
    const datasetRes = await request(app)
      .post(`/api/v1/datasets/${projectId}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        datasetType: 'DFSAR',
        filename: 'test_radar.tif',
        fileSize: 2048576
      });

    datasetId = datasetRes.body.datasetId;
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/v1/analysis/:projectId/detect-ice', () => {
    it('should start ice detection analysis', async () => {
      const res = await request(app)
        .post(`/api/v1/analysis/${projectId}/detect-ice`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          datasetId,
          parameters: {
            cprThreshold: 1.0,
            dopThreshold: 0.13,
            confidenceThreshold: 0.65
          }
        });

      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty('analysisId');
      expect(res.body).toHaveProperty('taskId');
      expect(res.body.status).toBe('queued');
    });

    it('should reject invalid dataset', async () => {
      const res = await request(app)
        .post(`/api/v1/analysis/${projectId}/detect-ice`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          datasetId: '00000000-0000-0000-0000-000000000000',
          parameters: { cprThreshold: 1.0 }
        });

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/v1/analysis/${projectId}/detect-ice`)
        .send({
          datasetId,
          parameters: { cprThreshold: 1.0 }
        });

      expect(res.status).toBe(401);
    });
  });
});
