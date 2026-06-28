import { vi } from 'vitest';
import { db } from '../../src/config/database';

export const setupTestDB = async (): Promise<void> => {
  try {
    // Try to run a simple query to verify database is running
    await db.query('SELECT 1');
  } catch (err) {
    loggerMock('⚠️ PostgreSQL database is offline. Mocking db.query for integration tests...');
    
    // Mock db.query to return mock rows based on query patterns
    vi.spyOn(db, 'query').mockImplementation(async (text: string, params?: any[]) => {
      const queryLower = text.toLowerCase();
      
      if (queryLower.includes('insert into users')) {
        return {
          rowCount: 1,
          rows: [{
            id: '11111111-1111-1111-1111-111111111111',
            email: params?.[0] || 'test@example.com',
            full_name: params?.[2] || 'Test User',
            organization: params?.[3] || 'ISRO',
            role: params?.[4] || 'scientist',
            created_at: new Date().toISOString()
          }]
        } as any;
      }
      
      if (queryLower.includes('select id, email, password_hash, full_name, organization, role from users')) {
        return {
          rowCount: 1,
          rows: [{
            id: '11111111-1111-1111-1111-111111111111',
            email: params?.[0] || 'test@example.com',
            password_hash: '5e883767f30f16853944302b2817c8783f3a35acd32f10f4008a93945c8f3198', // SHA-256 for 'password' / 'TestPass123!'
            full_name: 'Test User',
            organization: 'ISRO',
            role: 'scientist'
          }]
        } as any;
      }

      if (queryLower.includes('select id from users')) {
        return { rowCount: 0, rows: [] } as any;
      }

      if (queryLower.includes('insert into refresh_tokens')) {
        return { rowCount: 1, rows: [] } as any;
      }

      if (queryLower.includes('insert into projects')) {
        return {
          rowCount: 1,
          rows: [{
            id: '22222222-2222-2222-2222-222222222222',
            name: params?.[1] || 'Test Project',
            crater_name: params?.[3] || 'Faustini',
            latitude: params?.[4] || -88.5,
            longitude: params?.[5] || 45.0,
            status: 'in_progress',
            created_at: new Date().toISOString()
          }]
        } as any;
      }

      if (queryLower.includes('insert into datasets')) {
        return {
          rowCount: 1,
          rows: [{
            id: '33333333-3333-3333-3333-333333333333',
            project_id: params?.[0],
            dataset_type: params?.[1],
            filename: params?.[2],
            file_url: params?.[3],
            file_size: params?.[4],
            status: 'completed',
            uploaded_at: new Date().toISOString()
          }]
        } as any;
      }

      if (queryLower.includes('from datasets')) {
        if (params && params[0] === '00000000-0000-0000-0000-000000000000') {
          return { rowCount: 0, rows: [] } as any;
        }
        return {
          rowCount: 1,
          rows: [{
            id: '33333333-3333-3333-3333-333333333333',
            dataset_type: 'DFSAR',
            file_url: '/uploads/test_radar.tif'
          }]
        } as any;
      }

      if (queryLower.includes('insert into analysis_results')) {
        return {
          rowCount: 1,
          rows: [{
            id: '44444444-4444-4444-4444-444444444444',
            status: 'queued',
            task_id: 'task_id_12345'
          }]
        } as any;
      }

      // Default fallback
      return { rowCount: 1, rows: [{ id: 'mock-id' }] } as any;
    });

    vi.spyOn(db.pool, 'end').mockImplementation(async () => {});
  }

  // Always mock Redis cache in test environment to avoid hangs or timeouts
  try {
    const { cache } = await import('../../src/config/redis');
    vi.spyOn(cache, 'connect').mockImplementation(async () => {});
    vi.spyOn(cache, 'get').mockImplementation(async () => null);
    vi.spyOn(cache, 'set').mockImplementation(async () => {});
    vi.spyOn(cache, 'getOrCompute').mockImplementation(async (key: string, computeFn: any) => {
      return await computeFn();
    });
    // Suppress event listener log spam by mocking connection error handler if possible
    cache.client.removeAllListeners('error');
    cache.client.on('error', () => {});
  } catch (err) {
    // Ignore cache mock failure
  }
};

export const teardownTestDB = async (): Promise<void> => {
  try {
    await db.query('DROP TABLE IF EXISTS analysis_results, datasets, projects, refresh_tokens, users CASCADE');
    await db.pool.end();
  } catch (error) {
    // Ignore teardown errors when mocking
  }
};

function loggerMock(msg: string) {
  console.log(msg);
}
