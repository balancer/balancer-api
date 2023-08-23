import { handler } from './defender-webhook';
import { DefenderBody } from '@/modules/defender';
import { allowlistPool, allowlistTokens } from '@/modules/allowlist';
import mockDefenderEventBodyEthereum from '../../tests/mocks/defender-event-body-ethereum'
import mockDefenderEventBodyArbitrum from '../../tests/mocks/defender-event-body-arbitrum'

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

describe('Defender Webhook Lambda', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  })
  describe('TokenRegisteredEvent Ethereum', () => {
    beforeEach(() => {
      const body: DefenderBody = mockDefenderEventBodyEthereum;

      request = {
        body
      }
    });

    it('Should call allowlistPool with the chainId and poolId from the data', async () => {
      const response = await handler(request);
      expect(response.statusCode).toBe(200);
      expect(allowlistPool).toBeCalledWith(1, '0xc0d9c93759399ddb7310f68f6d007ba8c55c8cb60002000000000000000005d7');
    });

    it('Should call allowlistToken with the chainId and tokens from the data', async () => {
      const response = await handler(request);
      expect(response.statusCode).toBe(200);
      expect(allowlistTokens).toBeCalledWith(1, [
        '0x8929e9DbD2785e3BA16175E596CDD61520feE0D1',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      ]);
    });

  });

  describe('TokenRegisteredEvent Arbitrum', () => {
    beforeEach(() => {
      const body: DefenderBody = mockDefenderEventBodyArbitrum;

      request = {
        body
      }
    });

    it('Should call allowlistPool with the chainId and poolId from the data', async () => {
      const response = await handler(request);
      expect(response.statusCode).toBe(200);
      expect(allowlistPool).toBeCalledWith(42161, '0x0c8972437a38b389ec83d1e666b69b8a4fcf8bfd00000000000000000000049e');
    });

    it('Should call allowlistToken with the chainId and tokens from the data', async () => {
      const response = await handler(request);
      expect(response.statusCode).toBe(200);
      expect(allowlistTokens).toBeCalledWith(42161, [
        '0x0c8972437a38b389ec83d1E666b69b8a4fcf8bfd',
        '0x5979D7b546E38E414F7E9822514be443A4800529',
        '0x95aB45875cFFdba1E5f451B950bC2E42c0053f39',
        '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8',
      ]);
    });

  });
});
