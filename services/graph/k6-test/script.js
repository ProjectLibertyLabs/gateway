/*
 * Graph Service
 * Graph Service API
 *
 * OpenAPI spec version: 1.0
 *
 * NOTE: This class is auto generated by OpenAPI Generator.
 * https://github.com/OpenAPITools/openapi-generator
 *
 * Generator version: 7.7.0-SNAPSHOT
 */

import http from 'k6/http';
import { group, check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '10s',
  thresholds: {
    checks: ['rate>=0.995'],
    http_req_duration: ['avg<100', 'p(95)<200'],
    http_req_failed: ['rate<0.005'],
    http_reqs: ['rate>=256'],
  },
  noConnectionReuse: true,
};

const BASE_URL = 'http://localhost:3000';
// Sleep duration between successive requests.
// You might want to edit the value of this variable or remove calls to the sleep function on the script.
const SLEEP_DURATION = 0.1;
// Global variables should be initialized.

export default function () {
  group('/v1/webhooks', () => {
    // Request No. 1: WebhooksControllerV1_getAllWebhooks
    {
      let url = BASE_URL + `/v1/webhooks`;
      let request = http.get(url);

      check(request, {
        'Retrieved all registered webhooks': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }

    // Request No. 2: WebhooksControllerV1_deleteAllWebhooks
    {
      let url = BASE_URL + `/v1/webhooks`;
      let request = http.del(url);

      check(request, {
        'Removed all registered webhooks': (r) => r.status === 200,
      });
    }
  });

  group('/v1/webhooks/users/{msaId}', () => {
    let msaId = '2'; // extracted from 'example' field defined at the parameter level of OpenAPI spec

    // Request No. 1: WebhooksControllerV1_getWebhooksForMsa
    {
      let url = BASE_URL + `/v1/webhooks/users/${msaId}`;
      let request = http.get(url);

      check(request, {
        'Retrieved all registered webhooks for the given MSA ID': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }

    // Request No. 2: WebhooksControllerV1_deleteWebhooksForMsa
    {
      let url = BASE_URL + `/v1/webhooks/users/${msaId}`;
      let request = http.del(url);

      check(request, {
        'Removed all registered webhooks for the specified MSA': (r) => r.status === 200,
      });
    }
  });

  group('/v1/webhooks/urls', () => {
    let webhookUrl = 'http://localhost/webhook'; // extracted from 'example' field defined at the parameter level of OpenAPI spec

    // Request No. 1: WebhooksControllerV1_getWebhooksForUrl
    {
      let url = BASE_URL + `/v1/webhooks/urls?url=${webhookUrl}`;
      let request = http.get(url);

      check(request, {
        'Retrieved all webhooks registered to the specified URL': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }

    // Request No. 2: WebhooksControllerV1_deleteAllWebhooksForUrl
    {
      let url = BASE_URL + `/v1/webhooks/urls?url=${webhookUrl}`;
      let request = http.del(url);

      check(request, {
        'Removed all webhooks registered to the specified URL': (r) => r.status === 200,
      });
    }
  });

  group('/v1/graphs', () => {
    // Request No. 1: GraphControllerV1_updateGraph
    {
      let url = BASE_URL + `/v1/graphs`;
      let body = {
        dsnpId: '2',
        connections: {
          data: [
            {
              dsnpId: '3',
              privacyType: 'public',
              direction: 'connectionTo',
              connectionType: 'follow',
            },
          ],
        },
        graphKeyPairs: [],
      };
      let params = { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } };
      let request = http.put(url, JSON.stringify(body), params);

      check(request, {
        'Graph update request created successfully': (r) => r.status === 201,
      });
    }
  });

  group('/livez', () => {
    // Request No. 1: HealthController_livez
    {
      let url = BASE_URL + `/livez`;
      let request = http.get(url);

      check(request, {
        'Service is live': (r) => r.status === 200,
      });
    }
  });

  group('/v1/graphs/getGraphs', () => {
    const msaIds = ['2', '3', '4'];

    // Request No. 1: GraphControllerV1_getGraphs
    {
      let url = BASE_URL + `/v1/graphs/getGraphs`;
      let body = { dsnpIds: msaIds, privacyType: 'public', graphKeyPairs: [] };
      let params = { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } };
      let request = http.post(url, JSON.stringify(body), params);

      check(request, {
        'Graphs retrieved successfully': (r) => r.status === 200,
      });
    }
  });

  group('/readyz', () => {
    // Request No. 1: HealthController_readyz
    {
      let url = BASE_URL + `/readyz`;
      let request = http.get(url);

      check(request, {
        'Service is ready': (r) => r.status === 200,
      });
    }
  });

  group('/healthz', () => {
    // Request No. 1: HealthController_healthz
    {
      let url = BASE_URL + `/healthz`;
      let request = http.get(url);

      check(request, {
        'Service is healthy': (r) => r.status === 200,
      });
    }
  });
}
