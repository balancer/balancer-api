/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();

import { SorRequest } from '../../src/types';
import { parseFixed } from '@ethersproject/bignumber';
import { BigNumber } from 'ethers';
import { testSorRequest } from '../lib/sor';
import { Network } from '../../src/constants/general';
import { getInfuraUrl } from '../../src/utils';
import { forkSetup, getBalances } from '../lib/helpers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { TOKENS } from '../../src/constants/addresses';

const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

jest.unmock('@ethersproject/contracts');
jest.unmock('@balancer-labs/sdk');
jest.setTimeout(30000);

let provider, signer; 

const hardhatUrl = process.env.HARDHAT_URL || `http://127.0.0.1:8545`;
const rpcUrl = process.env.RPC_URL || getInfuraUrl(Network.MAINNET);

if (!rpcUrl) {
  console.error('Env variable RPC_URL or INFURA_PROJECT_ID must be set to run these tests')
  process.exit(1);
}

console.log("RPC URL is ", rpcUrl);

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

  describe('Mainnet Tests', () => {
    beforeAll(async () => {
      provider = new JsonRpcProvider(hardhatUrl, Network.MAINNET);
      console.log(`Impersonating ${WALLET_ADDRESS}`)
      await provider.send('hardhat_impersonateAccount', [WALLET_ADDRESS]);
      signer = await provider.getSigner(WALLET_ADDRESS);
    });

    it('Should be able to swap DAI for BAL', async () => {
      const { DAI, BAL } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: DAI.address,
        buyToken: BAL.address,
        orderKind: 'sell',
        amount: parseFixed('100', 18).toString(),
        gasPrice: BigNumber.from('0x174876e800').toString(),
      };
      await forkSetup(signer, [DAI], [sorRequest.amount], rpcUrl);
      const balances = await getBalances(signer, WALLET_ADDRESS, [BAL]);
      await testSorRequest(signer, WALLET_ADDRESS, Network.MAINNET, sorRequest);
      const newBalances = await getBalances(signer, WALLET_ADDRESS, [BAL]);
      expect(BigNumber.from(newBalances.BAL).gt(balances.BAL));
    });

    it('Should be able to swap BAL for USDC', async () => {
      const { BAL, USDC } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: BAL.address,
        buyToken: USDC.address,
        orderKind: 'sell',
        amount: parseFixed('100', 18).toString(),
        gasPrice: BigNumber.from('0x174876e800').toString(),
      };
      await forkSetup(signer, [BAL], [sorRequest.amount], rpcUrl)
      const balances = await getBalances(signer, WALLET_ADDRESS, [BAL, USDC]);
      await testSorRequest(signer, WALLET_ADDRESS, Network.MAINNET, sorRequest);
      const newBalances = await getBalances(signer, WALLET_ADDRESS, [BAL, USDC]);
      expect(BigNumber.from(newBalances.USDC).gt(balances.USDC));
    });
  });
});





