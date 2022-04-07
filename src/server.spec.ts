import { parseUnits } from 'ethers/lib/utils';
import supertest from 'supertest';
import { Network, SorRequest, SerializedSwapInfo } from './types';
import { createPoolsTable, createTokensTable, deleteTable, updateTokens, updatePools, isAlive } from './dynamodb';
import TOKENS from '../test/mocks/tokens.json';
import POOLS from '../test/mocks/pools.json';
import server from './server';

beforeAll(async () => {
  console.log("Checking DynamoDB is running...");
  const isDynamoDBAlive = await isAlive();
  if (!isDynamoDBAlive) {
    console.error("DynamoDB is not running. Please start it with `npm run dynamodb` before running the tests.");
    process.exit(1);
  }
  console.log("Create DynamoDB Tables...");
  await createPoolsTable();
  await createTokensTable();
  console.log("Populating Tables...");
  await updateTokens(TOKENS);
  await updatePools(POOLS);
  console.log("Running tests...");
});

const TOKEN_ADDRESSES = {};
TOKEN_ADDRESSES[Network.MAINNET] = {
  ETH: '0x0000000000000000000000000000000000000000',
  BAL: '0xba100000625a3754423978a60c9317c58a424e3d',
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  BBAUSD: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2'
}

describe('server.ts', () => {

  describe('GET /pools/:chainId', () => {
    it('Should return the pools on Ethereum', async () => {
      await supertest(server)
        .get('/pools/1')
        .expect(200)
        .then((res) => {
          const pools = res.body;
          expect(pools.length).toEqual(POOLS.length);
        });
    });

    it('Should return a 404 status code for a chain that doesnt exist', async () => {
      await supertest(server)
        .get('/pools/1111')
        .expect(404)
    });
  });

  describe('GET /pools/:chainId/:poolId', () => {
    it('Should return a single pools information', async () => {
      await supertest(server)
        .get('/pools/1/0x3ebf48cd7586d7a4521ce59e53d9a907ebf1480f000200000000000000000028')
        .expect(200)
        .then((res) => {
          const pool = res.body;
          expect(pool.address).toEqual('0x3ebf48cd7586d7a4521ce59e53d9a907ebf1480f');
        });
    });

    it('Should return a 404 status code for a pool that doesnt exist', async () => {
      await supertest(server)
        .get('/pools/1/0xabcdefcd7586d7a4521ce59e53d9a907ebf1480f000200000000000000000028')
        .expect(404);
    })
  })

  describe("POST /sor/:chainId", () => {

    describe("Happy Swaps", () => {
      const defaultSwapAmount = parseUnits('1', 18).toString();
      const defaultSorRequest: SorRequest = {
        sellToken: '',
        buyToken: '',
        orderKind: 'sell',
        amount: defaultSwapAmount,
        gasPrice: parseUnits('10', 'gwei').toString()
      }

      it('Should return BAL to DAI swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKEN_ADDRESSES[Network.MAINNET].BAL,
          buyToken: TOKEN_ADDRESSES[Network.MAINNET].DAI,
        };

        await supertest(server).post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then((res) => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].BAL);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].DAI);
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });
      });

      it('Should return USDC to DAI swap information', async () => {
        const USDCSwapAmount = parseUnits('1', 6).toString()
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKEN_ADDRESSES[Network.MAINNET].USDC,
          buyToken: TOKEN_ADDRESSES[Network.MAINNET].DAI,
          amount: USDCSwapAmount
        };

        await supertest(server).post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then((res) => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].USDC);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].DAI);
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(USDCSwapAmount);
          });
      });

      it('Should return WETH to USDT swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKEN_ADDRESSES[Network.MAINNET].WETH,
          buyToken: TOKEN_ADDRESSES[Network.MAINNET].USDT,
          amount: defaultSwapAmount
        };

        await supertest(server).post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then((res) => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].WETH);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].USDT);
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });
      });

      it('Should return ETH to BAL swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKEN_ADDRESSES[Network.MAINNET].ETH,
          buyToken: TOKEN_ADDRESSES[Network.MAINNET].BAL,
          amount: defaultSwapAmount
        };

        await supertest(server).post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then((res) => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].ETH);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].BAL);
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });
      });

      it('Should return bb-a-USD to USDT swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKEN_ADDRESSES[Network.MAINNET].BBAUSD,
          buyToken: TOKEN_ADDRESSES[Network.MAINNET].USDT,
          amount: defaultSwapAmount
        };

        await supertest(server).post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then((res) => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].BBAUSD);
            expect(response.tokenAddresses).toContain(TOKEN_ADDRESSES[Network.MAINNET].USDT);
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });

      });

    });

  });

});

afterAll(async () => {
  await deleteTable('pools');
  await deleteTable('tokens');
  server.close();
})