/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();

import { SorRequest } from '../../src/types';
import { parseFixed } from '@ethersproject/bignumber';
import { BigNumber } from 'ethers';
import { testSorRequest } from '../lib/sor';

const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

/**
 * These tests do the following:
 * - Make a request to the /sor endpoint
 * - Convert the response into a swap transaction
 * - Simulate that transaction with Hardhat and ensure it completes correctly
 */
describe('SOR Endpoint E2E tests', () => {
  beforeEach(() => {
    // Update API
    // Update hardhat to latest block number
  });

  it('Should be able to swap DAI for BAL', async () => {
    const sorRequest: SorRequest = {
      sellToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
      buyToken: '0xba100000625a3754423978a60c9317c58a424e3d',
      orderKind: 'sell',
      amount: parseFixed('100', 18).toString(),
      gasPrice: BigNumber.from('0x174876e800').toString(),
    };
    await testSorRequest(WALLET_ADDRESS, sorRequest);
    expect(1).toBe(1);
  });
});





