/* eslint-disable */
export default async () => {
    const t = {
        ["../../../libs/types/src/dtos/graph/privacy-type.enum"]: await import("../../../libs/types/src/dtos/graph/privacy-type.enum"),
        ["../../../libs/types/src/dtos/graph/direction.enum"]: await import("../../../libs/types/src/dtos/graph/direction.enum"),
        ["../../../libs/types/src/dtos/graph/connection-type.enum"]: await import("../../../libs/types/src/dtos/graph/connection-type.enum"),
        ["../../../libs/types/src/dtos/graph/connection.dto"]: await import("../../../libs/types/src/dtos/graph/connection.dto"),
        ["../../../libs/types/src/dtos/graph/key-type.enum"]: await import("../../../libs/types/src/dtos/graph/key-type.enum"),
        ["../../../libs/types/src/dtos/graph/graph-key-pair.dto"]: await import("../../../libs/types/src/dtos/graph/graph-key-pair.dto"),
        ["../../../libs/types/src/dtos/graph/dsnp-graph-edge.dto"]: await import("../../../libs/types/src/dtos/graph/dsnp-graph-edge.dto"),
        ["../../../libs/types/src/dtos/graph/user-graph.dto"]: await import("../../../libs/types/src/dtos/graph/user-graph.dto"),
        ["../../../libs/types/src/dtos/graph/graph-change-response.dto"]: await import("../../../libs/types/src/dtos/graph/graph-change-response.dto")
    };
    return { "@nestjs/swagger": { "models": [[import("../../../libs/types/src/dtos/graph/connection.dto"), { "ConnectionDto": { dsnpId: { required: true, type: () => String }, privacyType: { required: true, enum: t["../../../libs/types/src/dtos/graph/privacy-type.enum"].PrivacyType }, direction: { required: true, enum: t["../../../libs/types/src/dtos/graph/direction.enum"].Direction }, connectionType: { required: true, enum: t["../../../libs/types/src/dtos/graph/connection-type.enum"].ConnectionType } }, "ConnectionDtoWrapper": { data: { required: true, type: () => [t["../../../libs/types/src/dtos/graph/connection.dto"].ConnectionDto] } } }], [import("../../../libs/types/src/dtos/graph/dsnp-graph-edge.dto"), { "DsnpGraphEdgeDto": { userId: { required: true, type: () => String }, since: { required: true, type: () => Number } } }], [import("../../../libs/types/src/dtos/graph/graph-change-response.dto"), { "GraphChangeRepsonseDto": { referenceId: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/graph/graph-key-pair.dto"), { "GraphKeyPairDto": { publicKey: { required: true, type: () => String }, privateKey: { required: true, type: () => String }, keyType: { required: true, type: () => String, enum: t["../../../libs/types/src/dtos/graph/key-type.enum"].KeyType } } }], [import("../../../libs/types/src/dtos/graph/graph-query-params.dto"), { "GraphsQueryParamsDto": { dsnpIds: { required: true, type: () => [String] }, privacyType: { required: true, enum: t["../../../libs/types/src/dtos/graph/privacy-type.enum"].PrivacyType }, graphKeyPairs: { required: false, type: () => [t["../../../libs/types/src/dtos/graph/graph-key-pair.dto"].GraphKeyPairDto] } } }], [import("../../../libs/types/src/dtos/graph/provider-graph.dto"), { "ProviderGraphDto": { dsnpId: { required: true, type: () => String }, connections: { required: true, type: () => ({ data: { required: true, type: () => [t["../../../libs/types/src/dtos/graph/connection.dto"].ConnectionDto] } }) }, graphKeyPairs: { required: false, type: () => [t["../../../libs/types/src/dtos/graph/graph-key-pair.dto"].GraphKeyPairDto] }, webhookUrl: { required: false, type: () => String } } }], [import("../../../libs/types/src/dtos/graph/user-graph.dto"), { "UserGraphDto": { dsnpId: { required: true, type: () => String }, dsnpGraphEdges: { required: false, type: () => [t["../../../libs/types/src/dtos/graph/dsnp-graph-edge.dto"].DsnpGraphEdgeDto] } } }], [import("../../../libs/types/src/dtos/graph/watch-graphs.dto"), { "WatchGraphsDto": { dsnpIds: { required: false, type: () => [String] }, webhookEndpoint: { required: true, type: () => String } } }]], "controllers": [[import("./controllers/v1/graph-v1.controller"), { "GraphControllerV1": { "getGraphs": { type: [t["../../../libs/types/src/dtos/graph/user-graph.dto"].UserGraphDto] }, "updateGraph": { type: t["../../../libs/types/src/dtos/graph/graph-change-response.dto"].GraphChangeRepsonseDto } } }], [import("./controllers/health.controller"), { "HealthController": { "healthz": {}, "livez": {}, "readyz": {} } }], [import("./controllers/v1/webhooks-v1.controller"), { "WebhooksControllerV1": { "getAllWebhooks": { type: Object }, "getWebhooksForMsa": { type: [String] }, "getWebhooksForUrl": { type: [String] }, "watchGraphs": {}, "deleteAllWebhooks": {}, "deleteWebhooksForMsa": {}, "deleteAllWebhooksForUrl": {} } }]] } };
};