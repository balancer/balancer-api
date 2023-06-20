import fetch from 'isomorphic-fetch';
import { GitHubWebhookParams } from "./types";
import { ALLOWLIST_POOL_ENDPOINT } from '@/constants';

const { GH_WEBHOOK_PAT } = process.env;

export async function callGitHubWebhook(body: GitHubWebhookParams): Promise<ReturnType<fetch>> {
  return await fetch(ALLOWLIST_POOL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `token ${GH_WEBHOOK_PAT}`,
    },
    body: JSON.stringify(body),
  });
}