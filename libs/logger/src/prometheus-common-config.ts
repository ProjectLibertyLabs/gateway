export function createPrometheusConfig(processLabel: string): Record<string, any> {
  return {
    defaultLabels: { app: processLabel },
  };
}
