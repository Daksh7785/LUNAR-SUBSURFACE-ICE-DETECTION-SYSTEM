import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Enterprise-Grade k6 Performance and Load Testing Script.
 * Validates API responsiveness (<200ms target SLA), extreme concurrency handling,
 * and background Celery ML task dispatch throughput.
 */
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 virtual expert users
    { duration: '1m', target: 1000 },  // Stress testing spike up to 1,000 users
    { duration: '30s', target: 0 },    // Ramp down to zero
  ],
  thresholds: {
    // API responses must be 95% under 200ms
    http_req_duration: ['p(95)<200'],
    // Request failure rate must be 0%
    http_req_failed: ['rate==0.0'],
  },
};

const BASE_URL = 'http://localhost:80';

export default function () {
  // 1. Authenticate Expert User
  const loginPayload = JSON.stringify({
    email: 'mission_control@isro.gov.in',
    securityCode: 'isro_secure_admin_2026',
  });

  const headers = { 'Content-Type': 'application/json' };

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers });
  check(loginRes, {
    'Login succeeded (200)': (r) => r.status === 200,
    'JWT token returned': (r) => r.json('token') !== undefined,
  });

  const authToken = loginRes.json('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  sleep(1);

  // 2. Query Project Workspaces (Get List)
  const projectsRes = http.get(`${BASE_URL}/api/projects`, { headers: authHeaders });
  check(projectsRes, {
    'Fetched project workspaces (200)': (r) => r.status === 200,
    'Projects list returned': (r) => r.json('data') !== undefined,
  });

  sleep(1);

  // 3. Trigger AI Analysis Task (Celery Dispatch Simulation)
  const activeProjectId = 'prj_isro_faustini_01'; // Mock ID or extracted from previous response
  const analysisPayload = JSON.stringify({
    cprThreshold: 1.0,
    dopThreshold: 0.13,
    lunarRegion: 'Faustini',
  });

  const analysisRes = http.post(`${BASE_URL}/api/projects/${activeProjectId}/analysis`, analysisPayload, { headers: authHeaders });
  check(analysisRes, {
    'Dispatched Celery task successfully (200/202)': (r) => r.status === 200 || r.status === 202,
    'Response time under 200ms': (r) => r.timings.duration < 200,
  });

  sleep(2);
}
