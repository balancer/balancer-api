import { wrapHandler } from '@/modules/sentry';
import { captureException } from '@sentry/serverless';
import { formatResponse } from './utils';
import { DefenderBody, DefenderEvent, TokensRegisteredMatchReason } from '@/modules/defender';
import { allowlistPool, allowlistTokens } from '@/modules/allowlist';
import debug from 'debug';

/**
 * This webhook takes events from hal.xyz and performs actions with them
 *
 * The first action is to listen to new pool creation events on the Balancer Vault
 * and send the event details to a Github Webhook that creates a PR to allowlist the pool
 */

const log = debug('lambda:defender');

export const handler = wrapHandler(async (event: any = {}): Promise<any> => {
  log("Processing event: ", event);

  if (!event.body) {
    return {
      statusCode: 400,
      body: 'invalid request, you are missing the parameter body',
    };
  }

  try {
    const defenderBody: DefenderBody = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
    const defenderEvent: DefenderEvent = defenderBody.events[0];
    log("Defender Event: ", defenderEvent);
    const chainId = defenderEvent.sentinel.chainId;
    log('ChainID: ', chainId);

    if (defenderEvent.matchReasons[0]?.signature === 'TokensRegistered(bytes32,address[],address[])') {
      const parameters = (defenderEvent.matchReasons[0] as TokensRegisteredMatchReason).params;
      log("Parsing parameters: ", parameters);
      await allowlistPool(chainId, parameters.poolId);
      console.log("Successfully allowlisted pool ", parameters.poolId);
      await allowlistTokens(chainId, parameters.tokens);
      console.log("Successfully allowlisted tokens ", parameters.tokens);
    }

    log("Successfully parsed all events");
    return { statusCode: 200 };
  } catch (e) {
    console.log(`Received error processing Defender Webhook: ${e}`);
    captureException(e);
    return formatResponse(500, 'Unable to process webhook event');
  }
});
