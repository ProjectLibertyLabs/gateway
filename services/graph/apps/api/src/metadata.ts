/* eslint-disable */
export default async () => {
  const t = {
    ['../../../libs/common/src/dtos/privacy-type.enum']: await import('../../../libs/common/src/dtos/privacy-type.enum'),
    ['../../../libs/common/src/dtos/direction.enum']: await import('../../../libs/common/src/dtos/direction.enum'),
    ['../../../libs/common/src/dtos/connection-type.enum']: await import('../../../libs/common/src/dtos/connection-type.enum'),
    ['../../../libs/common/src/dtos/connection.dto']: await import('../../../libs/common/src/dtos/connection.dto'),
    ['../../../libs/common/src/dtos/key-type.enum']: await import('../../../libs/common/src/dtos/key-type.enum'),
    ['../../../libs/common/src/dtos/dsnp-graph-edge.dto']: await import('../../../libs/common/src/dtos/dsnp-graph-edge.dto'),
    ['../../../libs/common/src/dtos/graph-key-pair.dto']: await import('../../../libs/common/src/dtos/graph-key-pair.dto'),
    ['../../../libs/common/src/dtos/user-graph.dto']: await import('../../../libs/common/src/dtos/user-graph.dto'),
    ['../../../libs/common/src/dtos/graph-change-response.dto']: await import('../../../libs/common/src/dtos/graph-change-response.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('../../../libs/common/src/dtos/connection.dto'),
          {
            ConnectionDto: {
              dsnpId: { required: true, type: () => String },
              privacyType: { required: true, enum: t['../../../libs/common/src/dtos/privacy-type.enum'].PrivacyType },
              direction: { required: true, enum: t['../../../libs/common/src/dtos/direction.enum'].Direction },
              connectionType: { required: true, enum: t['../../../libs/common/src/dtos/connection-type.enum'].ConnectionType },
            },
            ConnectionDtoWrapper: { data: { required: true, type: () => [t['../../../libs/common/src/dtos/connection.dto'].ConnectionDto] } },
          },
        ],
        [
          import('../../../libs/common/src/dtos/dsnp-graph-edge.dto'),
          { DsnpGraphEdge: { userId: { required: true, type: () => String }, since: { required: true, type: () => Number } } },
        ],
        [
          import('../../../libs/common/src/dtos/graph-key-pair.dto'),
          {
            GraphKeyPairDto: {
              publicKey: { required: true, type: () => String },
              privateKey: { required: true, type: () => String },
              keyType: { required: true, type: () => String, enum: t['../../../libs/common/src/dtos/key-type.enum'].KeyType },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/user-graph.dto'),
          {
            UserGraphDto: {
              dsnpId: { required: true, type: () => String },
              dsnpGraphEdges: { required: false, type: () => [t['../../../libs/common/src/dtos/dsnp-graph-edge.dto'].DsnpGraphEdge] },
            },
          },
        ],
        [import('../../../libs/common/src/dtos/graph-change-response.dto'), { GraphChangeRepsonseDto: { referenceId: { required: true, type: () => String } } }],
        [
          import('../../../libs/common/src/dtos/graph-query-params.dto'),
          {
            GraphsQueryParamsDto: {
              dsnpIds: { required: true, type: () => [String] },
              privacyType: { required: true, enum: t['../../../libs/common/src/dtos/privacy-type.enum'].PrivacyType },
              graphKeyPairs: { required: false, type: () => [t['../../../libs/common/src/dtos/graph-key-pair.dto'].GraphKeyPairDto] },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/provider-graph.dto'),
          {
            ProviderGraphDto: {
              dsnpId: { required: true, type: () => String },
              connections: { required: true, type: () => ({ data: { required: true, type: () => [t['../../../libs/common/src/dtos/connection.dto'].ConnectionDto] } }) },
              graphKeyPairs: { required: false, type: () => [t['../../../libs/common/src/dtos/graph-key-pair.dto'].GraphKeyPairDto] },
              webhookUrl: { required: false, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/watch-graphs.dto'),
          { WatchGraphsDto: { dsnpIds: { required: false, type: () => [String] }, webhookEndpoint: { required: true, type: () => String } } },
        ],
      ],
      controllers: [
        [import('./controllers/health.controller'), { HealthController: { healthz: {}, livez: {}, readyz: {} } }],
        [
          import('./controllers/v1/webhooks-v1.controller'),
          {
            WebhooksControllerV1: {
              getAllWebhooks: { type: Object },
              getWebhooksForMsa: { type: [String] },
              getWebhooksForUrl: { type: [String] },
              watchGraphs: {},
              deleteAllWebhooks: {},
              deleteWebhooksForMsa: {},
              deleteAllWebhooksForUrl: {},
            },
          },
        ],
        [
          import('./controllers/v1/graph-v1.controller'),
          {
            GraphControllerV1: {
              getGraphs: { type: [t['../../../libs/common/src/dtos/user-graph.dto'].UserGraphDto] },
              updateGraph: { type: t['../../../libs/common/src/dtos/graph-change-response.dto'].GraphChangeRepsonseDto },
            },
          },
        ],
      ],
    },
  };
};
