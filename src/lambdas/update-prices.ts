import { getTokens } from '../data-providers/dynamodb';
import { updateTokenPrices } from '../tokens';

export const handler = async (): Promise<any> => {
  const log = console.log;

  try {
    log('Fetching all tokens.');
    const tokens = await getTokens();
    log(`Fetched ${tokens.length} tokens. Updating token prices`);
    await updateTokenPrices(tokens, true);
    log(`Updated prices`);
    return { statusCode: 201, body: '' };
  } catch (err) {
    log(`Received error: ${err}`);
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
