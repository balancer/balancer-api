import { handler } from './hal-webhook';
import { HALEventName, HALEvent } from '@/modules/hal';
import { allowlistPool } from '@/modules/allowlist';

jest.mock(
  '@/modules/allowlist',
  jest.fn().mockImplementation(() => {
    return {
      allowlistPool: jest.fn().mockImplementation(),
      allowlistTokens: jest.fn().mockImplementation()
    }
  })
);

let request;

describe('HAL Webhook Lambda', () => {
  describe('TokenRegisteredEvent', () => {
    beforeEach(() => {
      const body: HALEvent[] = [
        {
          contractAddress: '0xba12222222228d8ba445958a75a0704d566bf2c8',
          eventName: HALEventName.TokensRegistered,
          eventParameters: {
            assetManagers: [
              '0x0000000000000000000000000000000000000000',
              '0x0000000000000000000000000000000000000000',
              '0x0000000000000000000000000000000000000000',
            ],
            poolId:
              '0xdfe6e7e18f6cc65fa13c8d8966013d4fda74b6ba000000000000000000000558',
            tokens: [
              '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
              '0xdfe6e7e18f6cc65fa13c8d8966013d4fda74b6ba',
              '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb',
            ],
          },
          transaction: {
            blockHash:
              '0x1ebbeefe7ccd50a937d288a7806e0570187f14b03b382b45545f9c68043b2eb1',
            blockNumber: 17347414,
            blockTimestamp: 1685154395,
            from: '0x854b004700885a61107b458f11ecc169a019b764',
            to: '0xfada0f4547ab2de89d1304a668c39b3e09aa7c76',
            hash: '0x5a40175dcaac01496215f1f64d9a4e797672a5541d73e72021055791b981d67f',
            value: null,
            inputData: '',
          },
        },
      ];

      request = {
        pathParameters: {
          chainId: 1
        },
        body
      }
    });

    it('Should call allowlistPool with the chainId and poolId from the data', async () => {
      const response = await handler(request);
      expect(response.statusCode).toBe(200);
      expect(allowlistPool).toBeCalledWith(1, '0xdfe6e7e18f6cc65fa13c8d8966013d4fda74b6ba000000000000000000000558');
    });
  });
});
