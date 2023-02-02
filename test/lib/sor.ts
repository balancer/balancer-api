/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();

import axios from 'axios';
import { ADDRESSES, TOKENS } from '../../src/constants/addresses';
import { Network } from '../../src/constants/general';
import { JsonRpcSigner } from '@ethersproject/providers';
import { SwapTokenType, SwapToken, SorRequest } from '../../src/types';
import { hexValue } from '@ethersproject/bytes';
import { parseEther } from '@ethersproject/units';
import {
  Address,
  BatchSwap,
  SwapInfo,
  Swaps,
  SwapType,
} from '@balancer-labs/sdk';
import { BigNumber } from 'ethers';
import { printBalances, approveToken } from './helpers';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://api.balancer.fi';

const GWEI = 10 ** 9;
const GAS_PRICE = 500 * GWEI;

export async function testSorRequest(
  signer: JsonRpcSigner,
  walletAddress: Address,
  network: number,
  sorRequest: SorRequest
) {
  const { DAI, BAL } = TOKENS[network];

  const initialETH = parseEther('444').toHexString(10);

  const params = [
    walletAddress,
    hexValue(initialETH), // hex encoded wei amount
  ];

  await signer.provider.send('hardhat_setBalance', params);

  await printBalances(signer, walletAddress, [DAI, BAL]);

  const tokenToDispose =
    sorRequest.orderKind === 'sell'
      ? sorRequest.sellToken
      : sorRequest.buyToken;

  // Allow the vault to spend wallets tokens
  await approveToken(
    signer,
    tokenToDispose,
    sorRequest.amount,
    ADDRESSES[Network.MAINNET].contracts.vault
  );

  await printBalances(signer, walletAddress, [DAI, BAL]);

  const sorSwapInfo = await querySorEndpoint(sorRequest);
  const swapType =
    sorRequest.orderKind == 'sell'
      ? SwapType.SwapExactIn
      : SwapType.SwapExactOut;

  const batchSwapData = convertSwapInfoToBatchSwap(
    walletAddress,
    swapType,
    sorSwapInfo
  );

  const encodedBatchSwapData = Swaps.encodeBatchSwap(batchSwapData);

  const batchSwapParams = [
    {
      to: ADDRESSES[Network.MAINNET].contracts.vault,
      from: walletAddress,
      data: encodedBatchSwapData,
      gas: hexValue(3000000),
      gasPrice: hexValue(GAS_PRICE),
      value: BigNumber.from('20000000000000000').toHexString(10),
    },
  ];

  await signer.provider.send('eth_sendTransaction', batchSwapParams);
  await printBalances(signer, walletAddress, [DAI, BAL]);
}

export async function querySorEndpoint(
  sorRequest: SorRequest
): Promise<SwapInfo> {
  let sorSwapInfo: SwapInfo;
  try {
    const data = await axios.post(`${ENDPOINT_URL}/sor/1`, sorRequest);
    sorSwapInfo = data.data;
  } catch (e) {
    console.error('Failed to fetch sor data. Error is: ', e);
    process.exit(1);
  }

  console.log('Got swap info: ', sorSwapInfo);

  return sorSwapInfo;
}

function calculateLimits(
  tokensIn: SwapToken[],
  tokensOut: SwapToken[],
  tokenAddresses: string[]
): string[] {
  const limits: string[] = [];

  tokenAddresses.forEach((token, i) => {
    const tokenIn = tokensIn.find(
      swapToken => token.toLowerCase() === swapToken.address.toLowerCase()
    );
    const tokenOut = tokensOut.find(
      swapToken => token.toLowerCase() === swapToken.address.toLowerCase()
    );
    if (tokenIn) {
      limits[i] = tokenIn.amount.toString();
    } else if (tokenOut) {
      limits[i] = '0'; //tokenOut.amount.mul(-1).toString();
    } else {
      limits[i] = '0';
    }
  });

  console.log('Limits', limits);
  return limits;
}

function convertSwapInfoToBatchSwap(
  userAddress: string,
  swapType: SwapType,
  swapInfo: SwapInfo
): BatchSwap {
  const tokenIn: SwapToken = {
    address: swapInfo.tokenIn,
    amount: BigNumber.from(swapInfo.swapAmount),
    type: SwapTokenType.max,
  };
  const tokenOut: SwapToken = {
    address: swapInfo.tokenOut,
    amount: BigNumber.from(swapInfo.returnAmount),
    type: SwapTokenType.min,
  };
  const limits = calculateLimits(
    [tokenIn],
    [tokenOut],
    swapInfo.tokenAddresses
  );

  const batchSwapData: BatchSwap = {
    kind: swapType,
    swaps: swapInfo.swaps,
    assets: swapInfo.tokenAddresses,
    funds: {
      fromInternalBalance: false,
      sender: userAddress,
      recipient: userAddress,
      toInternalBalance: false,
    },
    limits: limits,
    deadline: '999999999999999999',
  };

  return batchSwapData;
}
