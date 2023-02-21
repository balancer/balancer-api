import { captureException } from '@sentry/serverless';
import { wrapHandler } from '../modules/sentry/sentry';
import { getTokens } from '../modules/dynamodb/dynamodb';
import { updateTokenPrices } from '../modules/tokens/tokens';

export const handler = wrapHandler(async (): Promise<any> => {
  const log = console.log;

  try {
    log('Fetching all tokens.');
    const tokens = await getTokens();
    log(`Fetched ${tokens.length} tokens. Updating token prices`);
    await updateTokenPrices(tokens, true);
    log(`Updated prices`);
    return { statusCode: 201, body: '' };
  } catch (e) {
    captureException(e);
    log(`Received error: ${e}`);
    return { statusCode: 500, body: 'Failed to update prices' };
  }
});
