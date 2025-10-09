import http from 'k6/http';
import { check, group } from 'k6';
import { createMockFile } from './helpers.js';

export const options = {
  vus: 100,
  duration: '30s',
  thresholds: {
    checks: ['rate>=0.995'],
    http_req_duration: ['avg<400000', 'p(95)<410000'],
    http_req_failed: ['rate<0.005'],
    http_reqs: ['rate>=0.24'],
  },
  noConnectionReuse: true,
};

// uses v2 asset upload endpoint to upload a bunch of "large" jpgs
export default function () {
  group('/v2/asset/upload large files', () => {
    const url = 'http://localhost:3000/v2/asset/upload';
    const data = createMockFile('lg', 'jpg', 'image/jpeg');
    const request = http.post(url, data, { 'Content-type': 'multipart/form-data', accept: 'application/json' });
    check(request, {
      '': (r) => r.status === 202,
    });
  });
}
