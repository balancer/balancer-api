import nock from 'nock';
import { allowlistPool } from './pool';
import { callGitHubWebhook } from '@/modules/github';

nock.disableNetConnect();

jest.mock('@ethersproject/contracts');
jest.mock(
  '@/modules/github',
  jest.fn().mockImplementation(() => {
    return {
      callGitHubWebhook: jest.fn().mockImplementation(() => {
        return { status: 200 };
      }),
    };
  })
);

describe('Allowlist Pool', () => {
  it('Should call the Github webhook with data passed into function', async () => {
    require('@ethersproject/contracts')._setSymbolMethod(() =>
      Promise.resolve('bb-a-USD')
    );
    require('@ethersproject/contracts')._setVersionMethod(() =>
      Promise.resolve(
        JSON.stringify({
          name: 'ComposableStablePool',
          version: 3,
          deployment: '20230206-composable-stable-pool-v3',
        })
      )
    );
    await allowlistPool(
      1,
      '0xfebb0bbf162e64fb9d0dfe186e517d84c395f016000000000000000000000502'
    );
    expect(callGitHubWebhook).toBeCalledWith({
      event_type: 'allowlist_pool',
      client_payload: {
        network: "mainnet",
        poolType: 'Stable',
        poolId:
          '0xfebb0bbf162e64fb9d0dfe186e517d84c395f016000000000000000000000502',
        poolDescription: 'bb-a-USD',
      },
    });
  });
});
