export interface IWebhookConfig {
  healthCheckMaxRetries: number;
  healthCheckMaxRetryIntervalSeconds: number;
  healthCheckSuccessThreshold: number;
  providerApiToken?: string;
  webhookBaseUrl: URL;
  webhookRetryIntervalSeconds: number;
}
