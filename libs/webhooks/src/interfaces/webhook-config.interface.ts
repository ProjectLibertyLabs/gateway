export interface IWebhookConfig {
  healthCheckMaxRetries: number;
  healthCheckMaxRetryIntervalSeconds: number;
  healthCheckSuccessThreshold: number;
  providerApiToken?: string;
  /**
   * If unset, the webhook client is considered disabled and the service should no-op.
   * This supports workers that can run without a configured provider webhook.
   */
  webhookBaseUrl?: URL;
  webhookRetryIntervalSeconds: number;
}
