import { parseUnits } from '@ethersproject/units';
import supertest from 'supertest';
import { Network, TOKENS } from '../../constants';
import { SorRequest, SerializedSwapInfo } from '@/modules/sor';
import { Token } from '@/modules/tokens';
import {
  createPoolsTable,
  createTokensTable,
  deleteTable,
  updateTokens,
  updatePools,
  isAlive,
  updateToken,
  getPools,
  getTokens,
} from '@/modules/dynamodb';
import { localAWSConfig } from '@/modules/aws';
import DBTOKENS from '../../../tests/mocks/tokens.json';
import DBPOOLS from '../../../tests/mocks/pools';
import server from './server';

const AWS = require('aws-sdk');
AWS.config.update(localAWSConfig);

jest.unmock('@balancer-labs/sdk');

beforeAll(async () => {
  console.log('Checking DynamoDB is running...');
  const isDynamoDBAlive = await isAlive();
  if (!isDynamoDBAlive) {
    console.error(
      'DynamoDB is not running. Please start it with `npm run dynamodb` before running the tests.'
    );
    process.exit(1);
  }
  console.log('Create DynamoDB Tables...');
  await createPoolsTable();
  await createTokensTable();
  console.log('Populating Tables...');
  await updateTokens(DBTOKENS);
  await updatePools(DBPOOLS);
  console.log('Checking tables were populated...');
  const pools = await getPools(1);
  expect(pools.length).toEqual(DBPOOLS.length);
  const tokens = await getTokens(1);
  expect(tokens.length).toEqual(DBTOKENS.length);
  console.log('Running tests...');
});



describe('server.ts', () => {
  describe('GET /pools/:chainId', () => {
    it('Should return the pools on Ethereum', async () => {
      await supertest(server)
        .get('/pools/1')
        .expect(200)
        .then(res => {
          const pools = res.body;
          expect(pools.length).toEqual(DBPOOLS.length);
        });
    });

    it('Should return a 404 status code for a chain that doesnt exist', async () => {
      await supertest(server).get('/pools/1111').expect(404);
    });
  });

  describe('GET /pools/:chainId/:poolId', () => {
    it('Should return a single pools information', async () => {
      await supertest(server)
        .get(
          '/pools/1/0x3ebf48cd7586d7a4521ce59e53d9a907ebf1480f000200000000000000000028'
        )
        .expect(200)
        .then(res => {
          const pool = res.body;
          expect(pool.address).toEqual(
            '0x3ebf48cd7586d7a4521ce59e53d9a907ebf1480f'
          );
        });
    });

    it('Should return a 404 status code for a pool that doesnt exist', async () => {
      await supertest(server)
        .get(
          '/pools/1/0xabcdefcd7586d7a4521ce59e53d9a907ebf1480f000200000000000000000028'
        )
        .expect(404);
    });
  });

  describe('POST /sor/:chainId', () => {
    const defaultSwapAmount = parseUnits('1', 18).toString();
    const defaultSorRequest: SorRequest = {
      sellToken: '',
      buyToken: '',
      orderKind: 'sell',
      amount: defaultSwapAmount,
      gasPrice: parseUnits('10', 'gwei').toString(),
    };

    describe('Happy Swaps', () => {
      it('Should return BAL to DAI swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKENS[Network.MAINNET].BAL.address,
          buyToken: TOKENS[Network.MAINNET].DAI.address,
        };

        await supertest(server)
          .post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then(res => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].BAL.address
            );
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].DAI.address
            );
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });
      });

      it('Should return USDC to DAI swap information', async () => {
        const USDCSwapAmount = parseUnits('1', 6).toString();
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKENS[Network.MAINNET].USDC.address,
          buyToken: TOKENS[Network.MAINNET].DAI.address,
          amount: USDCSwapAmount,
        };

        await supertest(server)
          .post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then(res => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].USDC.address
            );
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].DAI.address
            );
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(USDCSwapAmount);
          });
      });

      it('Should return WETH to USDT swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKENS[Network.MAINNET].WETH.address,
          buyToken: TOKENS[Network.MAINNET].USDT.address,
          amount: defaultSwapAmount,
        };

        await supertest(server)
          .post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then(res => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].WETH.address
            );
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].USDT.address
            );
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });
      });

      it('Should return ETH to BAL swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKENS[Network.MAINNET].ETH.address,
          buyToken: TOKENS[Network.MAINNET].BAL.address,
          amount: defaultSwapAmount,
        };

        await supertest(server)
          .post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then(res => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].ETH.address
            );
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].BAL.address
            );
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });
      });

      it('Should return bb-a-USD to USDT swap information', async () => {
        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: TOKENS[Network.MAINNET].bbausd.address,
          buyToken: TOKENS[Network.MAINNET].USDT.address,
          amount: defaultSwapAmount,
        };

        await supertest(server)
          .post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then(res => {
            const response = res.body as SerializedSwapInfo;
            expect(response.tokenAddresses.length).toBeGreaterThanOrEqual(2);
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].bbausd.address
            );
            expect(response.tokenAddresses).toContain(
              TOKENS[Network.MAINNET].USDT.address
            );
            expect(response.swaps.length).toBeGreaterThanOrEqual(1);
            expect(response.swapAmount).toBe(defaultSwapAmount);
          });
      });
    });

    describe('Error Handling', () => {
      it('Should not crash when handling a token without decimals', async () => {
        const badTokenAddress = '0xa7fD7D83E2d63f093b71C5F3B84c27cFF66A7802';
        const tokenWithoutDecimals: Token = {
          chainId: 137,
          symbol: 'BAD',
          address: badTokenAddress,
          price: {
            usd: '5',
          },
        };
        await updateToken(tokenWithoutDecimals);

        const sorRequest: SorRequest = {
          ...defaultSorRequest,
          sellToken: '0xa7fD7D83E2d63f093b71C5F3B84c27cFF66A7802',
          buyToken: TOKENS[Network.MAINNET].DAI.address,
        };

        await supertest(server)
          .post('/sor/1')
          .send(sorRequest)
          .expect(200)
          .then(res => {
            const response = res.body as SerializedSwapInfo;
            console.log('Response: ', response);
            expect(response.tokenAddresses.length).toEqual(0);
            expect(response.swaps.length).toEqual(0);
            expect(response.swapAmount).toBe('0');
          });
      });
    });
  });

  describe('GET /tokens/:chainId', () => {
    it('Should return the tokens on Ethereum', async () => {
      await supertest(server)
        .get('/tokens/1')
        .expect(200)
        .then(res => {
          const tokens = res.body;
          expect(tokens.length).toEqual(DBTOKENS.length);
        });
    });

    it('Should return a 404 status code for a chain that doesnt exist', async () => {
      await supertest(server).get('/tokens/1111').expect(404);
    });
  });

  describe('GET /tokens/:chainId/:tokenId', () => {
    it('Should return a single tokens information', async () => {
      await supertest(server)
        .get(`/tokens/1/${TOKENS[Network.MAINNET].DAI.address}`)
        .expect(200)
        .then(res => {
          const token = res.body;
          expect(token.symbol).toEqual('DAI');
        });
    });

    it('Should return a 404 status code for a token that doesnt exist', async () => {
      await supertest(server)
        .get('/tokens/1/0xaaaaaaaab223fe8d0a0e5c4f27ead9083c756cc2')
        .expect(404);
    });
  });
});

afterAll(async () => {
  await deleteTable('pools');
  await deleteTable('tokens');
  server.close();
});
