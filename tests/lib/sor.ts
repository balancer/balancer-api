/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();

import axios from 'axios';
import _ from 'lodash';
import { MaxUint256 } from '@ethersproject/constants';
import { hexValue } from '@ethersproject/bytes';
import { ADDRESSES } from '@/constants/addresses';
import { JsonRpcSigner } from '@ethersproject/providers';
import { SorRequest, convertSwapInfoToBatchSwap, SorOrderResponse } from '@/modules/sor';
import { approveToken } from './helpers';
import {
  Address,
  SwapInfo,
  Swaps,
  SwapType,
} from '@balancer-labs/sdk';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://api.balancer.fi';

const GWEI = 10 ** 9;
const GAS_PRICE = 500 * GWEI;

export interface SorOptions {
  useDb?: string;
  minLiquidity?: string;
}

export async function testSorRequest(
  signer: JsonRpcSigner,
  network: number,
  sorRequest: SorRequest,
  sorOptions?: SorOptions,
) {
  const sorSwapInfo = await querySorEndpoint(network, sorRequest, sorOptions);
  const swapType =
    sorRequest.orderKind == 'sell'
      ? SwapType.SwapExactIn
      : SwapType.SwapExactOut;

  if (sorSwapInfo.swaps.length === 0) {
    throw new Error('Failed to find a valid swap');
  }

  return testSorSwap(signer, network, swapType, sorSwapInfo);
}

export async function testOrderRequest(
  signer: JsonRpcSigner,
  network: number,
  sorRequest: SorRequest,
) {
  const sorOrderInfo: SorOrderResponse = await queryOrderEndpoint(network, sorRequest);

  // Allow the vault to spend wallets tokens
  await approveToken(
    signer,
    sorRequest.sellToken,
    MaxUint256,
    sorOrderInfo.price.allowanceTarget
  );
  
  const batchSwapParams = [
    {
      to: sorOrderInfo.to,
      from: sorRequest.sender,
      data: sorOrderInfo.data,
      gas: hexValue(3000000),
      gasPrice: hexValue(GAS_PRICE),
    },
  ];

  await signer.provider.send('eth_sendTransaction', batchSwapParams);
}

export async function testSorSwap(
  signer: JsonRpcSigner,
  network: number,
  swapType: SwapType,
  sorSwapInfo: SwapInfo
) {
  const walletAddress: Address = await signer.getAddress();

  // Allow the vault to spend wallets tokens
  await approveToken(
    signer,
    sorSwapInfo.tokenIn,
    MaxUint256,
    ADDRESSES[network].contracts.vault
  );

  const batchSwapData = convertSwapInfoToBatchSwap(
    swapType,
    sorSwapInfo,
    walletAddress,
    walletAddress,
  );

  const encodedBatchSwapData = Swaps.encodeBatchSwap(batchSwapData);

  console.log("Encoded data: ", encodedBatchSwapData);

  const batchSwapParams = [
    {
      to: ADDRESSES[network].contracts.vault,
      from: walletAddress,
      data: encodedBatchSwapData,
      gas: hexValue(3000000),
      gasPrice: hexValue(GAS_PRICE),
    },
  ];

  await signer.provider.send('eth_sendTransaction', batchSwapParams);
}

export async function querySorEndpoint(
  network: number,
  sorRequest: SorRequest,
  sorOptions?: SorOptions
): Promise<SwapInfo> {
  let sorSwapInfo: SwapInfo;
  try {
    const params = new URLSearchParams(_.omitBy(sorOptions, _.isUndefined)).toString();
    const data = await axios.post(`${ENDPOINT_URL}/sor/${network}/?${params}`, sorRequest);
    sorSwapInfo = data.data;
  } catch (e) {
    console.error('Failed to fetch sor data. Error is: ', e);
    process.exit(1);
  }

  return sorSwapInfo;
}

export async function queryOrderEndpoint(
  network: number,
  sorRequest: SorRequest,
): Promise<SorOrderResponse> {
  let sorSwapInfo: SorOrderResponse;
  try {
    const data = await axios.post(`${ENDPOINT_URL}/order/${network}/`, sorRequest);
    sorSwapInfo = data.data;
  } catch (e) {
    console.error('Failed to fetch sor data. Error is: ', e);
    process.exit(1);
  }

  return sorSwapInfo;
}
