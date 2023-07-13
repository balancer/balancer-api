/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();

import axios from 'axios';
import { SorOrderResponse, SorRequest } from '@/modules/sor';
import { parseFixed } from '@ethersproject/bignumber';
import { BigNumber } from 'ethers';
import { queryOrderEndpoint, testOrderRequest } from '@tests/lib/sor';
import { Network } from '@/constants/general';
import config from '@/config';
import { getRpcUrl } from '@/modules/network';
import {
  forkSetup,
  getBalances,
  setEthBalance,
  setTokenBalance,
} from '@tests/lib/helpers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { TOKENS } from '@/constants/addresses';

jest.unmock('@ethersproject/contracts');
jest.unmock('@sobal/sdk');
jest.setTimeout(30000);

let provider, signer;

const hardhatUrl = process.env.HARDHAT_URL || `http://127.0.0.1:8545`;
const rpcUrl = process.env.RPC_URL || getRpcUrl(Network.MAINNET);
const endpointUrl = process.env.ENDPOINT_URL || `https://api.sobal.fi`;
const walletAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const recipientWalletAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

if (!rpcUrl) {
  console.error(
    'Env variable RPC_URL or INFURA_PROJECT_ID must be set to run these tests'
  );
  process.exit(1);
}

const GAS_PRICE = parseFixed('50', 9).toString();

/**
 * These tests do the following:
 * - Make a request to the /sor endpoint
 * - Convert the response into a swap transaction
 * - Simulate that transaction with Hardhat and ensure it completes correctly
 */
describe('/order E2E tests', () => {
  beforeAll(async () => {
    // Update all pools
    try {
      console.log(`Updating pools at ${endpointUrl}/pools/1/update`);
      await axios.post(`${endpointUrl}/pools/1/update`);
    } catch (e) {
      console.log(
        'Received error updating pools, this is probably because another update is already in process.'
      );
      // Ignore, just means there's another update in progress.
    }
  });

  beforeEach(async () => {
    provider = new JsonRpcProvider(hardhatUrl, Network.MAINNET);
    await forkSetup(provider.getSigner(), rpcUrl);
  });

  describe('Mainnet Tests', () => {
    beforeEach(async () => {
      await provider.send('hardhat_impersonateAccount', [walletAddress]);
      signer = await provider.getSigner(walletAddress);
      await setEthBalance(signer, parseFixed('100', 18));
    });

    describe('Batch Swaps', () => {
      it('Should be able to sell DAI for BAL', async () => {
        const { DAI, BAL } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: DAI.address,
          buyToken: BAL.address,
          orderKind: 'sell',
          amount: parseFixed('100', DAI.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
        };
        await setTokenBalance(signer, DAI, sorRequest.amount);
        const balances = await getBalances(signer, [BAL]);
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newBalances = await getBalances(signer, [BAL]);
        expect(BigNumber.from(newBalances.BAL).gt(balances.BAL)).toBeTruthy();
      });

      it('Should be able to sell BAL for USDC', async () => {
        const { BAL, USDC } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: BAL.address,
          buyToken: USDC.address,
          orderKind: 'sell',
          amount: parseFixed('100', BAL.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
        };
        await setTokenBalance(signer, BAL, sorRequest.amount);
        const balances = await getBalances(signer, [BAL, USDC]);
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newBalances = await getBalances(signer, [BAL, USDC]);
        expect(BigNumber.from(newBalances.USDC).gt(balances.USDC)).toBeTruthy();
      });

      it('Should be able to buy DAI with USDC', async () => {
        const { USDC, DAI } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: USDC.address,
          buyToken: DAI.address,
          orderKind: 'buy',
          amount: parseFixed('100', DAI.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
        };
        await setTokenBalance(
          signer,
          USDC,
          BigNumber.from(sorRequest.amount).mul(2)
        );
        const balances = await getBalances(signer, [USDC, DAI]);
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newBalances = await getBalances(signer, [USDC, DAI]);
        expect(BigNumber.from(newBalances.DAI).gt(balances.DAI)).toBeTruthy();
      });

      it('Should be able to sell waUSDC for DAI', async () => {
        const { waUSDC, DAI } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: waUSDC.address,
          buyToken: DAI.address,
          orderKind: 'sell',
          amount: parseFixed('100', waUSDC.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
        };
        await setTokenBalance(signer, waUSDC, sorRequest.amount);
        const balances = await getBalances(signer, [waUSDC, DAI]);
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newBalances = await getBalances(signer, [waUSDC, DAI]);
        expect(BigNumber.from(newBalances.DAI).gt(balances.DAI)).toBeTruthy();
      });

      it('Should be able to buy USDC with USDT', async () => {
        const { USDT, USDC } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: USDT.address,
          buyToken: USDC.address,
          orderKind: 'buy',
          amount: parseFixed('1000', USDC.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
        };
        await setTokenBalance(
          signer,
          USDT,
          BigNumber.from(sorRequest.amount).mul(2)
        );
        const balances = await getBalances(signer, [USDT, USDC]);
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newBalances = await getBalances(signer, [USDT, USDC]);
        expect(BigNumber.from(newBalances.USDC).gt(balances.USDC)).toBeTruthy();
      });

      it('Should be able to sell WETH for bbausd', async () => {
        const { WETH, bbausd2 } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: WETH.address,
          buyToken: bbausd2.address,
          orderKind: 'sell',
          amount: parseFixed('10', WETH.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
        };
        await setTokenBalance(signer, WETH, sorRequest.amount);
        const balances = await getBalances(signer, [WETH, bbausd2]);
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newBalances = await getBalances(signer, [WETH, bbausd2]);
        expect(
          BigNumber.from(newBalances.bbausd2).gt(balances.bbausd2)
        ).toBeTruthy();
      });

      it('Should be able to sell BAL for USDC and send to another receipient', async () => {
        const { BAL, USDC } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: BAL.address,
          buyToken: USDC.address,
          orderKind: 'sell',
          amount: parseFixed('100', BAL.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
          recipient: recipientWalletAddress,
        };
        await setTokenBalance(signer, BAL, sorRequest.amount);
        const senderBalances = await getBalances(signer, [BAL, USDC]);
        const recipientSigner = await provider.getSigner(
          recipientWalletAddress
        );
        const recipientBalances = await getBalances(recipientSigner, [
          BAL,
          USDC,
        ]);
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newRecipientBalances = await getBalances(recipientSigner, [
          BAL,
          USDC,
        ]);
        expect(
          BigNumber.from(newRecipientBalances.BAL).eq(recipientBalances.BAL)
        ).toBeTruthy();
        expect(
          BigNumber.from(newRecipientBalances.USDC).gt(recipientBalances.USDC)
        ).toBeTruthy();
        const newSenderBalances = await getBalances(signer, [BAL, USDC]);
        expect(
          BigNumber.from(newSenderBalances.BAL).lt(senderBalances.BAL)
        ).toBeTruthy();
        expect(
          BigNumber.from(newSenderBalances.USDC).eq(senderBalances.USDC)
        ).toBeTruthy();
      });
    });

    describe('Relayer Swaps', () => {
      it('Should be able to sell WETH for auraBal through a join/exit swap', async () => {
        const { WETH, auraBal } = TOKENS[Network.MAINNET];
        const sorRequest: SorRequest = {
          sellToken: WETH.address,
          buyToken: auraBal.address,
          orderKind: 'sell',
          amount: parseFixed('1000', WETH.decimals).toString(),
          gasPrice: GAS_PRICE,
          sender: walletAddress,
        };
        await setTokenBalance(signer, WETH, sorRequest.amount);
        const balances = await getBalances(signer, [WETH, auraBal]);
        const sorOrderInfo: SorOrderResponse = await queryOrderEndpoint(
          Network.MAINNET,
          sorRequest
        );
        expect(sorOrderInfo.to).toEqual(
          config[Network.MAINNET].addresses.batchRelayer
        );
        await testOrderRequest(signer, Network.MAINNET, sorRequest);
        const newBalances = await getBalances(signer, [WETH, auraBal]);
        expect(
          BigNumber.from(newBalances.auraBal).gt(balances.auraBal)
        ).toBeTruthy();
      });
    });
  });
});
