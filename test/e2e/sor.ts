/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();

import axios from 'axios';
import { ADDRESSES } from '../../src/constants/addresses';
import { Network } from '../../src/constants/general';
import { AddressZero, MaxUint256 } from '@ethersproject/constants';
import {
  JsonRpcProvider,
  JsonRpcSigner,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/providers';
import { SwapTokenType, SwapToken } from '../../src/types';
import { hexValue } from '@ethersproject/bytes';
import { parseEther } from '@ethersproject/units';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import {
  BalancerSDK,
  BatchSwap,
  SwapAttributes,
  SwapInfo,
  Swaps,
  SwapType,
} from '@balancer-labs/sdk';
import { BigNumber, Wallet } from 'ethers';
import { String } from 'aws-sdk/clients/dynamodb';
import { Json } from 'aws-sdk/clients/robomaker';
import {
  mockSimpleBatchSwap,
  mockSwapFromFrontend,
  sorRequest,
} from '../mocks/sor';
import {
  printBalances,
  approveToken,
  generateToken,
} from './helpers';

const ERC20_ABI = require('../../src/lib/abi/ERC20.json');
const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://api.balancer.fi';
const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const ADMIN_ADDRESS = '0x0000000000000000000000000000000000000001';
const GWEI = 10 ** 9;
const GAS_PRICE = 500 * GWEI;
const rpcUrl = `http://127.0.0.1:8545`;

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl,
});



/** Steps to be done
 *
 * - Trigger an update of the API so it fetches the latest pool info
 * - Go through a series of common SOR swaps, send to endpoint, receive response
 * - Turn response into a transaction
 * - Simulate transaction with Tenderly, make sure it completes correctly
 */

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

function convertSwapInfoToBatchSwap(userAddress: string, swapType: SwapType, swapInfo: SwapInfo): BatchSwap {
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

  // const encodedBatchSwapData = Swaps.encodeBatchSwap(mockSimpleBatchSwap(userAddress));

  // const swapAttributes: SwapAttributes = sdk.swaps.buildSwap({
  //   userAddress,
  //   swapInfo,
  //   kind: SwapType.SwapExactIn,
  //   deadline: BigNumber.from(Date.now() + (1000 * 60)),
  //   maxSlippage: 100
  // });
  // console.log("Swap attributes: ", swapAttributes);

  // const encodedBatchSwapData = Swaps.encodeBatchSwap(swapAttributes.attributes as BatchSwap)

  return batchSwapData;
}



async function runTests(walletAddress) {
  const provider = new JsonRpcProvider(rpcUrl, Network.MAINNET);
  // const signer = provider.getSigner();


  console.log(`Addresses:\nSigner: ${await signer.getAddress()}\nAdmin: ${ADMIN_ADDRESS}\nWallet: ${WALLET_ADDRESS}`);

  const initialETH = parseEther('444').toHexString(10);

  const params = [
    walletAddress,
    hexValue(initialETH), // hex encoded wei amount
  ];

  console.log('Adding balance, params: ', params);

  await provider.send('hardhat_setBalance', params);

  await provider.send('hardhat_impersonateAccount', [ADMIN_ADDRESS]);
  const signer = await provider.getSigner(ADMIN_ADDRESS);

  await generateToken(
    provider,
    ADDRESSES[Network.MAINNET].DAI,
    parseFixed('4444', 18).toHexString(10),
    walletAddress
  );
  await approveToken(
    provider,
    ADDRESSES[Network.MAINNET].DAI,
    MaxUint256.toString(),
    walletAddress,
    ADDRESSES[Network.MAINNET].contracts.vault
  );

  await generateToken(
    provider,
    ADDRESSES[Network.MAINNET].USDC,
    parseFixed('4444', 6).toHexString(10),
    walletAddress
  );
  await approveToken(
    provider,
    ADDRESSES[Network.MAINNET].DAI,
    MaxUint256.toString(),
    walletAddress,
    ADDRESSES[Network.MAINNET].contracts.vault
  );

  await printBalances(provider, walletAddress);

  let sorSwapInfo: SwapInfo;
  try {
    const data = await axios.post(`${ENDPOINT_URL}/sor/1`, sorRequest);
    sorSwapInfo = data.data;
  } catch (e) {
    console.error('Failed to fetch sor data. Error is: ', e);
    process.exit(1);
  }

  console.log('Got swap info: ', sorSwapInfo);

  // sorSwapInfo = mockSwapFromFrontend();
  // console.log('Mock swap info from Frontend: ', sorSwapInfo);

  const swapType = sorRequest.orderKind == 'sell' ? SwapType.SwapExactIn : SwapType.SwapExactOut;

  const batchSwapData = convertSwapInfoToBatchSwap(
    walletAddress,
    swapType,
    sorSwapInfo
  );

  console.log('Swap converted to batch swap: ', batchSwapData);

  console.log('Encoding batch swap');

  const encodedBatchSwapData = Swaps.encodeBatchSwap(batchSwapData);

  // console.log('Encoded data: ', encodedBatchSwapData);

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
  console.log('Sending batch swap');

  const batchSwapTx: TransactionResponse = await provider.send(
    'eth_sendTransaction',
    batchSwapParams
  );

  console.log('Batch swap complete');

  await printBalances(provider, walletAddress);

  // const TENDERLY_FORK_ACCESS_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/fork/${forkId}`
  // await axios.delete(TENDERLY_FORK_ACCESS_URL, opts)
}

runTests(WALLET_ADDRESS);
