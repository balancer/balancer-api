export interface GitHubWebhookParams {
  event_type: string;
  client_payload: Record<string, string>;
}