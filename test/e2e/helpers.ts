
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

const ERC20_ABI = require('../../src/lib/abi/ERC20.json');
const ADMIN_ADDRESS = '0x0000000000000000000000000000000000000001';
const GWEI = 10 ** 9;
const GAS_PRICE = 500 * GWEI;

type Address = string;

export async function printBalances(provider: JsonRpcProvider, walletAddress: string) {
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

export async function generateToken(
  provider: JsonRpcProvider,
  token: Address,
  amount: string,
  wallet: Address
) {
  approveToken(provider, token, amount, ADMIN_ADDRESS, token)

  const tokenContract = new Contract(token, ERC20_ABI);

  console.log(`Transferring ${amount} from ${AddressZero} to ${wallet}`)

  // console.log('Transferring ', parseFixed(BigNumber.from(tokenAmount).toString(), 18), ' to ', walletAddress);
  const unsignedTx = await tokenContract.populateTransaction.transferFrom(
    AddressZero,
    wallet,
    amount
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

  await provider.send(
    'eth_sendTransaction',
    transactionParameters
  );
}

export async function approveToken (
  provider: JsonRpcProvider,
  token: Address,
  amount: string,
  wallet: Address,
  spender: Address,
): Promise<void> {

  console.log(`Approving token ${token} for wallet ${wallet} to spender ${spender}`)
  
  const tokenContract = new Contract(token, ERC20_ABI);

  const unsignedTx = await tokenContract.populateTransaction.approve(
    spender,
    amount,
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

  await provider.send(
    'eth_sendTransaction',
    transactionParameters
  );
}


// export async function approveTokenBasic (
//   token: string,
//   amount: string,
//   signer: JsonRpcSigner
// ): Promise<boolean> {
//   console.log('Approving token ', token);
//   const tokenContract = new Contract(token, ERC20_ABI, signer);

  
//   return await tokenContract
//     .connect(signer)
//     .approve(ADDRESSES[Network.MAINNET].contracts.vault, amount);
// }
