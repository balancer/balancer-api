/** Tests fetching common token trades from the SOR endpoint, converting them into a transaction, and simulates with Tenderly to make sure they work*/
require('dotenv').config();
import { SerializedSwapInfo, SorRequest } from '../../src/types';
import { ADDRESSES } from '../../src/constants/addresses';
import { Network } from '../../src/constants/general';
import { AddressZero, MaxInt256 } from '@ethersproject/constants';
import {
  JsonRpcProvider,
  JsonRpcSigner,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/providers';
import { hexValue } from '@ethersproject/bytes';
import { parseEther } from '@ethersproject/units';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import axios from 'axios';
import { Contract } from '@ethersproject/contracts';
import {
  BalancerSDK,
  BatchSwap,
  SwapAttributes,
  SwapInfo,
  Swaps,
  SwapType,
} from '@balancer-labs/sdk';
import { BigNumber } from 'ethers';
import { String } from 'aws-sdk/clients/dynamodb';
import { Json } from 'aws-sdk/clients/robomaker';

const ERC20_ABI = require('../../src/lib/abi/ERC20.json');
const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;
const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;
const TENDERLY_FORK_API = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/fork`;

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://api.balancer.fi';
const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const ADMIN_ADDRESS = '0x0000000000000000000000000000000000000001';

interface TenderlyForkResponse {
  forkId: string;
  forkRPC: string;
}

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

const sorRequest: SorRequest = {
  sellToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
  buyToken: '0xba100000625a3754423978a60c9317c58a424e3d',
  orderKind: 'buy',
  amount: '1000000000000000000',
  gasPrice: '10000000',
};

const sorResponse: SerializedSwapInfo = {
  tokenAddresses: [
    '0x6b175474e89094c44da98b954eedeac495271d0f',
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    '0xba100000625a3754423978a60c9317c58a424e3d',
  ],
  swaps: [
    {
      poolId:
        '0xbcae92a7ef7ff3feec11eb3354990640f6e5842f0002000000000000000003d1',
      assetInIndex: 0,
      assetOutIndex: 1,
      amount: '699424720798068046',
      userData: '0x',
      returnAmount: '10228131218777839',
    },
    {
      poolId:
        '0x20facecaa68e9b7c92d2d0ec9136d864df805233000100000000000000000190',
      assetInIndex: 1,
      assetOutIndex: 2,
      amount: '0',
      userData: '0x',
      returnAmount: '127660178724891069',
    },
    {
      poolId:
        '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011',
      assetInIndex: 0,
      assetOutIndex: 2,
      amount: '300575279201931954',
      userData: '0x',
      returnAmount: '46529693520513340',
    },
  ],
  swapAmount: '1000000000000000000',
  swapAmountForSwaps: '1000000000000000000',
  returnAmount: '174189872245404409',
  returnAmountFromSwaps: '174189872245404409',
  returnAmountConsideringFees: '173586880760688253',
  tokenIn: '0x6b175474e89094c44da98b954eedeac495271d0f',
  tokenOut: '0xba100000625a3754423978a60c9317c58a424e3d',
  marketSp: '4.6423397764319384672265717344106',
};

export enum SwapTokenType {
  fixed,
  min,
  max,
}

export interface SwapToken {
  address: string;
  amount: BigNumber;
  type: SwapTokenType;
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

function encodeSorResultAsBatchSwap(userAddress: string, swapInfo: SwapInfo) {
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

  const encodedBatchSwapData = Swaps.encodeBatchSwap({
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
  });

  // const encodedBatchSwapData = Swaps.encodeBatchSwap({
  //   kind: SwapType.SwapExactIn,
  //   swaps: [
  //     // First pool swap: 0.01ETH > USDC
  //     {
  //       poolId:
  //         '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
  //       // ETH
  //       assetInIndex: 0,
  //       // USDC
  //       assetOutIndex: 1,
  //       amount: '10000000000000000',
  //       userData: '0x',
  //     },
  //     // Second pool swap: 0.01ETH > BAL
  //     {
  //       poolId:
  //         '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
  //       // ETH
  //       assetInIndex: 0,
  //       // BAL
  //       assetOutIndex: 2,
  //       amount: '10000000000000000',
  //       userData: '0x',
  //     },
  //   ],
  //   assets: [
  //     // Balancer use the zero address for ETH and the Vault will wrap/unwrap as neccessary
  //     AddressZero,
  //     // USDC
  //     ADDRESSES[Network.MAINNET].USDC,
  //     // BAL
  //     ADDRESSES[Network.MAINNET].BAL,
  //   ],
  //   funds: {
  //     fromInternalBalance: false,
  //     // These can be different addresses!
  //     recipient: userAddress,
  //     sender: userAddress,
  //     toInternalBalance: false,
  //   },
  //   limits: ['20000000000000000', '0', '0'], // +ve for max to send, -ve for min to receive
  //   deadline: '999999999999999999', // Infinity
  // });

  // const swapAttributes: SwapAttributes = sdk.swaps.buildSwap({
  //   userAddress,
  //   swapInfo,
  //   kind: SwapType.SwapExactIn,
  //   deadline: BigNumber.from(Date.now() + (1000 * 60)),
  //   maxSlippage: 100
  // });
  // console.log("Swap attributes: ", swapAttributes);

  // const encodedBatchSwapData = Swaps.encodeBatchSwap(swapAttributes.attributes as BatchSwap)

  return encodedBatchSwapData;
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

async function createTenderlyFork(): Promise<TenderlyForkResponse> {
  const opts = {
    headers: {
      'X-Access-Key': TENDERLY_ACCESS_KEY as string,
    },
  };

  const forkBody = {
    network_id: '1',
  };

  console.log('Creating fork simulation');

  const resp = await axios.post(TENDERLY_FORK_API, forkBody, opts);

  console.log('Response: ', resp);

  const forkId = resp.data.simulation_fork.id;
  const forkRPC = `https://rpc.tenderly.co/fork/${forkId}`;

  console.log('Created fork: ', forkId, ' rpc: ', forkRPC);

  return {
    forkId,
    forkRPC,
  };
}

async function generateToken(
  provider: JsonRpcProvider,
  tokenAddress: string,
  tokenAmount: string,
  walletAddress: string
) {
  console.log("Generating ", tokenAddress, " amount: ", tokenAmount, " to wallet: ", walletAddress);

  const signer = provider.getSigner();
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

  const unsignedTx = await tokenContract.populateTransaction.approve(
    // ADMIN_ADDRESS,
    await signer.getAddress(),
    // tokenAmount,
    MaxInt256.toString()
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

  console.log('TX info: ', txHash);

  // await txHash.wait();

  console.log(
    'Transferring ',
    tokenAmount,
    ' from ',
    ADMIN_ADDRESS,
    ' to ',
    walletAddress
  );
  const respTxTransfer = await tokenContract.transferFrom(
    ADMIN_ADDRESS,
    walletAddress,
    tokenAmount
  );

  await respTxTransfer.wait();

  console.log('Transfer: ', respTxTransfer);
}

async function initializeSimulation(walletAddress) {
  const provider = new JsonRpcProvider(rpcUrl, Network.MAINNET);
  const signer = provider.getSigner();

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
    parseFixed('444', 18).toHexString(10),
    walletAddress
  );
  await generateToken(
    provider,
    ADDRESSES[Network.MAINNET].USDC,
    parseFixed('444', 6).toHexString(10),
    walletAddress
  );

  await printBalances(provider, walletAddress);

  let sorSwapData;
  try {
    const data = await axios.post(`${ENDPOINT_URL}/sor/1`, sorRequest);
    sorSwapData = data.data;
  } catch (e) {
    console.error('Failed to fetch sor data. Error is: ', e);
    process.exit(1);
  }

  console.log('Got swap data: ', sorSwapData);

  console.log('Creating batch swap');
  const encodedBatchSwapData = encodeSorResultAsBatchSwap(
    walletAddress,
    sorSwapData
  );

  console.log('Encoded data: ', encodedBatchSwapData);

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
  console.log('Sending batch swap of params: ', batchSwapParams);
  const batchSwapTx: TransactionResponse = await provider.send(
    'eth_sendTransaction',
    batchSwapParams
  );

  console.log('Batch swap complete. Details: ', batchSwapTx);

  await printBalances(provider, walletAddress);

  // const TENDERLY_FORK_ACCESS_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/fork/${forkId}`
  // await axios.delete(TENDERLY_FORK_ACCESS_URL, opts)
}

initializeSimulation('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
