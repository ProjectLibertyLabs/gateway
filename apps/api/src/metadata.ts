/* eslint-disable */
export default async () => {
  const t = {
    ['../../../libs/common/src/dtos/dsnp.graph.edge.dto']: await import('../../../libs/common/src/dtos/dsnp-graph-edge.dto'),
    ['../../../libs/common/src/dtos/key.type.dto']: await import('../../../libs/common/src/dtos/key-type.enum'),
    ['../../../libs/common/src/dtos/privacy.type.dto']: await import('../../../libs/common/src/dtos/privacy-type.enum'),
    ['../../../libs/common/src/dtos/graph.key.pair.dto']: await import('../../../libs/common/src/dtos/graph-key-pair.dto'),
    ['../../../libs/common/src/dtos/direction.dto']: await import('../../../libs/common/src/dtos/direction.enum'),
    ['../../../libs/common/src/dtos/connection.type.dto']: await import('../../../libs/common/src/dtos/connection-type.enum'),
    ['../../../libs/common/src/dtos/connections.dto']: await import('../../../libs/common/src/dtos/connection.dto'),
    ['../../../libs/common/src/dtos/user.graph.dto']: await import('../../../libs/common/src/dtos/user-graph.dto'),
    ['../../../libs/common/src/dtos/graph.change.request.reference']: await import('../../../libs/common/src/dtos/graph-change-response.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('../../../libs/common/src/dtos/dsnp-graph-edge.dto'),
          { DsnpGraphEdge: { userId: { required: true, type: () => String }, since: { required: true, type: () => Number } } },
        ],
        [
          import('../../../libs/common/src/dtos/user-graph.dto'),
          {
            UserGraphDto: {
              dsnpId: { required: true, type: () => String },
              dsnpGraphEdges: { required: false, type: () => [t['../../../libs/common/src/dtos/dsnp.graph.edge.dto'].DsnpGraphEdge] },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/graph-key-pair.dto'),
          {
            GraphKeyPairDto: {
              publicKey: { required: true, type: () => String },
              privateKey: { required: true, type: () => String },
              keyType: { required: true, type: () => String, enum: t['../../../libs/common/src/dtos/key.type.dto'].KeyType },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/graph-query-params.dto'),
          {
            GraphsQueryParamsDto: {
              dsnpIds: { required: true, type: () => [String] },
              privacyType: { required: true, enum: t['../../../libs/common/src/dtos/privacy.type.dto'].PrivacyType },
              graphKeyPairs: { required: true, type: () => [t['../../../libs/common/src/dtos/graph.key.pair.dto'].GraphKeyPairDto] },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/connection.dto'),
          {
            ConnectionDto: {
              dsnpId: { required: true, type: () => String },
              privacyType: { required: true, enum: t['../../../libs/common/src/dtos/privacy.type.dto'].PrivacyType },
              direction: { required: true, enum: t['../../../libs/common/src/dtos/direction.dto'].Direction },
              connectionType: { required: true, enum: t['../../../libs/common/src/dtos/connection.type.dto'].ConnectionType },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/provider-graph.dto'),
          {
            ProviderGraphDto: {
              dsnpId: { required: true, type: () => String },
              connections: { required: true, type: () => ({ data: { required: true, type: () => [t['../../../libs/common/src/dtos/connections.dto'].ConnectionDto] } }) },
              graphKeyPairs: { required: false, type: () => [t['../../../libs/common/src/dtos/graph.key.pair.dto'].GraphKeyPairDto] },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/watch-graphs.dto'),
          { WatchGraphsDto: { dsnpIds: { required: true, type: () => [String] }, webhookEndpoint: { required: true, type: () => String } } },
        ],
        [
          import('../../../libs/common/src/dtos/graph-change-notification.dto'),
          { GraphChangeNotificationDto: { dsnpId: { required: true, type: () => String }, update: { required: true, type: () => Object } } },
        ],
      ],
      controllers: [
        [
          import('./api.controller'),
          {
            ApiController: {
              health: {},
              getGraphs: { type: [t['../../../libs/common/src/dtos/user.graph.dto'].UserGraphDto] },
              updateGraph: { type: t['../../../libs/common/src/dtos/graph.change.request.reference'].GraphChangeRepsonseDto },
              watchGraphs: {},
            },
          },
        ],
      ],
    },
  };
};
