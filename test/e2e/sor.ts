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

const ERC20_ABI = require('../../src/lib/abi/ERC20.json');
const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://api.balancer.fi';
const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const WALLET_KEY =
  process.env.WALLET_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const ADMIN_ADDRESS = '0x0000000000000000000000000000000000000001';

const rpcUrl = `http://127.0.0.1:8545`;

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl,
});

const GWEI = 10 ** 9;
const GAS_PRICE = 500 * GWEI;

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

function convertSwapInfoToBatchSwap(userAddress: string, swapInfo: SwapInfo): BatchSwap {
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
    kind: SwapType.SwapExactIn,
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

async function printBalances(provider: JsonRpcProvider, walletAddress: string) {
  const daiContract = new Contract(
    ADDRESSES[Network.MAINNET].DAI,
    ERC20_ABI,
    provider
  );
  const usdcContract = new Contract(
    ADDRESSES[Network.MAINNET].USDC,
    ERC20_ABI,
    provider
  );
  const balContract = new Contract(
    ADDRESSES[Network.MAINNET].BAL,
    ERC20_ABI,
    provider
  );

  const ethBalance = await provider.getBalance(walletAddress);
  const daiBalance = await daiContract.balanceOf(walletAddress);
  const usdcBalance = await usdcContract.balanceOf(walletAddress);
  const balBalance = await balContract.balanceOf(walletAddress);
  console.log(`Token Balances`);
  console.log(`ETH: ${ethBalance.toString()}`);
  console.log(`BAL: ${balBalance.toString()}`);
  console.log(`DAI: ${daiBalance.toString()}`);
  console.log(`USDC: ${usdcBalance.toString()}`);
}

async function generateToken(
  provider: JsonRpcProvider,
  tokenAddress: string,
  tokenAmount: string,
  walletAddress: string
) {
  console.log(
    'Generating ',
    tokenAddress,
    ' amount: ',
    tokenAmount,
    ' to wallet: ',
    walletAddress
  );

  const signer = provider.getSigner();
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

  const unsignedTx = await tokenContract.populateTransaction.approve(
    // ADMIN_ADDRESS,
    await signer.getAddress(),
    tokenAmount,
    // MaxUint256.toString()
  );

  const transactionParameters = [
    {
      to: tokenContract.address,
      from: ADMIN_ADDRESS,
      data: unsignedTx.data,
      gas: hexValue(3000000),
      gasPrice: hexValue(GAS_PRICE),
      value: hexValue(0),
    },
  ];
  const txHash: TransactionResponse = await provider.send(
    'eth_sendTransaction',
    transactionParameters
  );

  console.log('Transferring ', tokenAmount, ' to ', walletAddress);
  const respTxTransfer = await tokenContract.transferFrom(
    ADMIN_ADDRESS,
    walletAddress,
    tokenAmount
  );

  await respTxTransfer.wait();

  console.log('Transfer: ', respTxTransfer);
}

export const approveToken = async (
  token: string,
  amount: string,
  signer: JsonRpcSigner
): Promise<boolean> => {
  console.log('Approving token ', token);
  const tokenContract = new Contract(token, ERC20_ABI, signer);
  return await tokenContract
    .connect(signer)
    .approve(ADDRESSES[Network.MAINNET].contracts.vault, amount);
};

async function initializeSimulation(walletAddress) {
  const provider = new JsonRpcProvider(rpcUrl, Network.MAINNET);
  const signer = provider.getSigner();
  const wallet = new Wallet(WALLET_KEY, provider);
  // const walletSigner = wallet.getSi

  const initialETH = parseEther('444').toHexString(10);

  const params = [
    [walletAddress],
    hexValue(initialETH), // hex encoded wei amount
  ];

  // console.log('Adding balance, params: ', params);

  // await provider.send('tenderly_addBalance', params);

  // console.log('Added balance, now doing DAI');

  // converts 1 ether into wei, stripping the leading zeros
  const tokenAmount = hexValue(parseEther('1').toHexString(10));

  await provider.send('hardhat_impersonateAccount', [ADMIN_ADDRESS]);

  await generateToken(
    provider,
    ADDRESSES[Network.MAINNET].DAI,
    parseFixed('4444', 18).toHexString(10),
    walletAddress
  );
  await approveToken(
    ADDRESSES[Network.MAINNET].DAI,
    MaxUint256.toString(),
    signer
  );

  await generateToken(
    provider,
    ADDRESSES[Network.MAINNET].USDC,
    parseFixed('4444', 6).toHexString(10),
    walletAddress
  );
  await approveToken(
    ADDRESSES[Network.MAINNET].USDC,
    MaxUint256.toString(),
    signer
  );

  await printBalances(provider, walletAddress);

  let sorSwapInfo;
  try {
    const data = await axios.post(`${ENDPOINT_URL}/sor/1`, sorRequest);
    sorSwapInfo = data.data;
  } catch (e) {
    console.error('Failed to fetch sor data. Error is: ', e);
    process.exit(1);
  }

  console.log('Got swap info: ', sorSwapInfo);

  // console.log('Swap converted to batch swap: ', convertSwapInfoToBatchSwap(
  //   walletAddress,
  //   sorSwapInfo
  // ));

  // sorSwapInfo = mockSwapFromFrontend();

  // console.log('Mock swap info from Frontend: ', sorSwapInfo);


  const batchSwapData = convertSwapInfoToBatchSwap(
    walletAddress,
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

initializeSimulation('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
