/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();

import axios from 'axios';
import { SorRequest } from '@/modules/sor';
import { parseFixed } from '@ethersproject/bignumber';
import { BigNumber } from 'ethers';
import { querySorEndpoint, testSorRequest, testSorSwap } from '@tests/lib/sor';
import { Network } from '@/constants/general';
import { getRpcUrl } from '@/modules/network';
import { forkSetup, getBalances, setEthBalance, setTokenBalance } from '@tests/lib/helpers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { TOKENS } from '@/constants/addresses';
import { SwapInfo, SwapType } from '@balancer-labs/sdk';

const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

jest.unmock('@ethersproject/contracts');
jest.unmock('@balancer-labs/sdk');
jest.setTimeout(30000);

let provider, signer; 

const hardhatUrl = process.env.HARDHAT_URL || `http://127.0.0.1:8545`;
const rpcUrl = process.env.RPC_URL || getRpcUrl(Network.MAINNET);
const endpointUrl = process.env.ENDPOINT_URL || `https://api.balancer.fi`;

if (!rpcUrl) {
  console.error('Env variable RPC_URL or INFURA_PROJECT_ID must be set to run these tests')
  process.exit(1);
}

const GAS_PRICE = parseFixed('50', 9).toString();

/**
 * These tests do the following:
 * - Make a request to the /sor endpoint
 * - Convert the response into a swap transaction
 * - Simulate that transaction with Hardhat and ensure it completes correctly
 */
describe('SOR Endpoint E2E tests', () => {
  beforeAll(async () => {
    // Update all pools
    try {
      console.log(`Updating pools at ${endpointUrl}/pools/1/update`)
      await axios.post(`${endpointUrl}/pools/1/update`);
    } catch (e) {
      console.log("Received error updating pools, this is probably because another update is already in process.");
      // Ignore, just means there's another update in progress. 
    }
  });

  beforeEach(async () => {
    provider = new JsonRpcProvider(hardhatUrl, Network.MAINNET);
    await forkSetup(provider.getSigner(), rpcUrl);
  });

  describe('Mainnet Tests', () => {
    beforeEach(async () => {
      await provider.send('hardhat_impersonateAccount', [WALLET_ADDRESS]);
      signer = await provider.getSigner(WALLET_ADDRESS);
      await setEthBalance(signer, parseFixed('100', 18));
    });

    it('Should be able to sell DAI for BAL', async () => {
      const { DAI, BAL } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: DAI.address,
        buyToken: BAL.address,
        orderKind: 'sell',
        amount: parseFixed('100', DAI.decimals).toString(),
        gasPrice: GAS_PRICE,
      };
      await setTokenBalance(signer, DAI, sorRequest.amount)
      const balances = await getBalances(signer, [BAL]);
      await testSorRequest(signer, Network.MAINNET, sorRequest);
      const newBalances = await getBalances(signer, [BAL]);
      expect(BigNumber.from(newBalances.BAL).gt(balances.BAL));
    });

    it('Should be able to sell BAL for USDC', async () => {
      const { BAL, USDC } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: BAL.address,
        buyToken: USDC.address,
        orderKind: 'sell',
        amount: parseFixed('100', BAL.decimals).toString(),
        gasPrice: GAS_PRICE,
      };
      await setTokenBalance(signer, BAL, sorRequest.amount)
      const balances = await getBalances(signer, [BAL, USDC]);
      await testSorRequest(signer, Network.MAINNET, sorRequest);
      const newBalances = await getBalances(signer, [BAL, USDC]);
      expect(BigNumber.from(newBalances.USDC).gt(balances.USDC));
    });

    it('Should be able to buy DAI with USDC', async () => {
      const { USDC, DAI } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: USDC.address,
        buyToken: DAI.address,
        orderKind: 'buy',
        amount: parseFixed('100', DAI.decimals).toString(),
        gasPrice: GAS_PRICE,
      };
      await setTokenBalance(signer, USDC, BigNumber.from(sorRequest.amount).mul(2))
      const balances = await getBalances(signer, [USDC, DAI]);
      await testSorRequest(signer, Network.MAINNET, sorRequest);
      const newBalances = await getBalances(signer, [USDC, DAI]);
      expect(BigNumber.from(newBalances.DAI).gt(balances.DAI));
    });

    it('Should be able to sell waUSDC for DAI', async () => {
      const { waUSDC, DAI } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: waUSDC.address,
        buyToken: DAI.address,
        orderKind: 'sell',
        amount: parseFixed('100', waUSDC.decimals).toString(),
        gasPrice: GAS_PRICE,
      };
      await setTokenBalance(signer, waUSDC, sorRequest.amount)
      const balances = await getBalances(signer, [waUSDC, DAI]);
      await testSorRequest(signer, Network.MAINNET, sorRequest);
      const newBalances = await getBalances(signer, [waUSDC, DAI]);
      expect(BigNumber.from(newBalances.DAI).gt(balances.DAI));
    });

    it('Should be able to buy USDC with USDT', async () => {
      const { USDT, USDC } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: USDT.address,
        buyToken: USDC.address,
        orderKind: 'buy',
        amount: parseFixed('1000', USDC.decimals).toString(),
        gasPrice: GAS_PRICE,
      };
      await setTokenBalance(signer, USDT, BigNumber.from(sorRequest.amount).mul(2))
      const balances = await getBalances(signer, [USDT, USDC]);
      await testSorRequest(signer, Network.MAINNET, sorRequest)
      const newBalances = await getBalances(signer, [USDT, USDC]);
      expect(BigNumber.from(newBalances.USDC).gt(balances.USDC));
    });

    it('Should be able to sell WETH for bbausd', async () => {
      const { WETH, bbausd2 } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: WETH.address,
        buyToken: bbausd2.address,
        orderKind: 'sell',
        amount: parseFixed('10', WETH.decimals).toString(),
        gasPrice: GAS_PRICE,
      };
      await setTokenBalance(signer, WETH, sorRequest.amount)
      const balances = await getBalances(signer, [WETH, bbausd2]);
      await testSorRequest(signer, Network.MAINNET, sorRequest);
      const newBalances = await getBalances(signer, [WETH, bbausd2]);
      expect(BigNumber.from(newBalances.bbausd2).gt(balances.bbausd2));
    });

    it('Should fail if the SwapInfo is invalid', async () => {
      const { USDC, DAI } = TOKENS[Network.MAINNET];
      const sorRequest: SorRequest = {
        sellToken: USDC.address,
        buyToken: DAI.address,
        orderKind: 'sell',
        amount: '153492299',
        gasPrice: GAS_PRICE,
      };
      await setTokenBalance(signer, USDC, sorRequest.amount)
      const swapInfo: SwapInfo = await querySorEndpoint(Network.MAINNET, sorRequest);

      // Modify the swapInfo to increase returnAmount by 10% as this should fail
      const originalReturnAmount = BigNumber.from(swapInfo.returnAmount);
      const newReturnAmount = originalReturnAmount.mul(11).div(10);
      swapInfo.swaps = swapInfo.swaps.map((swap) => {
        if (swap.returnAmount === originalReturnAmount.toString()) {
          return {
            ...swap,
            returnAmount: newReturnAmount.toString()
          }
        }

        return swap;
      });
      swapInfo.returnAmount = newReturnAmount;
      swapInfo.returnAmountFromSwaps = newReturnAmount;
      swapInfo.returnAmountConsideringFees = newReturnAmount;

      const testSwap = async () => {
        await testSorSwap(signer, Network.MAINNET, SwapType.SwapExactIn, swapInfo);
      }

      await expect(testSwap).rejects.toThrow(Error);
    });
  });
});





