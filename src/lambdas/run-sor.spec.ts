import nock from 'nock';
import { parseUnits } from '@ethersproject/units';
import { SerializedSwapInfo, SorRequest } from '../types';
import { Network, TOKENS } from '../constants';
import { handler } from './run-sor';
import { getSorSwap } from '../sor';

nock.disableNetConnect();

jest.mock(
  '../sor.ts',
  jest.fn().mockImplementation(() => {
    return {
      getSorSwap: jest.fn().mockImplementation(async () => {
        return defaultSorResponse;
      }),
    };
  })
);

const defaultSorRequest: SorRequest = {
  sellToken: TOKENS[Network.MAINNET].USDC.address,
  buyToken: TOKENS[Network.MAINNET].DAI.address,
  orderKind: 'sell',
  amount: parseUnits('1', 6).toString(),
  gasPrice: parseUnits('10', 'gwei').toString(),
};

const defaultSorResponse: SerializedSwapInfo = {
  tokenAddresses: [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0x6b175474e89094c44da98b954eedeac495271d0f',
  ],
  swaps: [
    {
      poolId:
        '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
      assetInIndex: 0,
      assetOutIndex: 1,
      amount: '100000',
      userData: '0x',
      returnAmount: '99993595091598074',
    },
  ],
  swapAmount: '100000',
  swapAmountForSwaps: '100000',
  returnAmount: '99993595091598074',
  returnAmountFromSwaps: '99993595091598074',
  returnAmountConsideringFees: '98711910222080195',
  tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  tokenOut: '0x6b175474e89094c44da98b954eedeac495271d0f',
  marketSp: '1.000064053143862455',
};

const defaultEvent = {
  body: defaultSorRequest,
  pathParameters: {
    chainId: Network.MAINNET
  },
  queryStringParameters: {}
};


describe('Run SOR Lambda', () => {
  describe('useDb', () => {
    it('Should use the database by default', async () => {
      const response = await handler(defaultEvent);
      expect(response.statusCode).toBe(200);
      expect(getSorSwap).toBeCalledWith(Network.MAINNET, defaultSorRequest, { useDb: true })
    });

    it('Should use the database when useDb param is passed', async () => {
      const sorRequest = { ...defaultSorRequest };
      const event = { ...defaultEvent, ... {
        body: sorRequest,
        queryStringParameters: {
          useDb: '1'
        }
      }};
      const response = await handler(event);
      expect(response.statusCode).toBe(200);
      expect(getSorSwap).toBeCalledWith(Network.MAINNET, sorRequest, { useDb: true })
    });

    it('Should use the subgraph when useDb param is set to "0"', async () => {
      const sorRequest = { ...defaultSorRequest };
      const event = { ...defaultEvent, ... {
        body: sorRequest,
        queryStringParameters: {
          useDb: '0'
        }
      }};
      const response = await handler(event);
      expect(response.statusCode).toBe(200);
      expect(getSorSwap).toBeCalledWith(Network.MAINNET, sorRequest, { useDb: false })
    });

    it('Should use the subgraph when useDb param is set to "false"', async () => {
      const sorRequest = { ...defaultSorRequest };
      const event = { ...defaultEvent, ... {
        body: sorRequest,
        queryStringParameters: {
          useDb: 'false'
        }
      }};
      const response = await handler(event);
      expect(response.statusCode).toBe(200);
      expect(getSorSwap).toBeCalledWith(Network.MAINNET, sorRequest, { useDb: false })
    });
  });

  describe('minLiquidity', () => {
    it('Should use minLiquidity', async () => {
      const event = {...defaultEvent, ...{
        queryStringParameters: {
          minLiquidity: '100'
        }
      }}
      const response = await handler(event);
      expect(response.statusCode).toBe(200);
      expect(getSorSwap).toBeCalledWith(Network.MAINNET, defaultSorRequest, { useDb: true, minLiquidity: '100' })
    });
  })
});
