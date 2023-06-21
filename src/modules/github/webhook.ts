import fetch from 'isomorphic-fetch';
import { GitHubWebhookParams } from "./types";

const { GH_WEBHOOK_PAT } = process.env;

export async function callGitHubWebhook(endpoint: string, body: GitHubWebhookParams): Promise<ReturnType<fetch>> {
  return await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `token ${GH_WEBHOOK_PAT}`,
    },
    body: JSON.stringify(body),
  });
}