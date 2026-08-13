import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 600 }, // Ramp up to 600 users
    { duration: '2m', target: 600 }, // Stay at 600 users for 2 minutes
    { duration: '30s', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% failure rate
  },
};

const BASE_URL = 'http://localhost:3000/api';

export default function () {
  // 1. Get Leaderboard (high read traffic)
  const lbRes = http.get(`${BASE_URL}/leaderboard/users`);
  check(lbRes, {
    'leaderboard status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1); // Think time 1-3 seconds

  // 2. Get Challenges (high read traffic)
  const chalRes = http.get(`${BASE_URL}/challenges`);
  check(chalRes, {
    'challenges status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(Math.random() * 2 + 1); // Think time 1-3 seconds
}
