
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

export async function mintToken(
  provider: JsonRpcProvider,
  token: Address,
  amount: string,
  wallet: Address,
) {
  const signerZero = provider.getSigner(AddressZero);
  const signer = provider.getSigner(wallet);

  const tokenContract = new Contract(token, ERC20_ABI, signerZero);

  console.log(`Transferring ${amount} from ${AddressZero} to ${await signer.getAddress()}`)
  const tx = await tokenContract.transfer(
    await signer.getAddress(),
    amount
  );

  await tx.wait();

}

export async function approveToken (
  signer: JsonRpcSigner,
  token: Address,
  amount: string,
  spender: Address,
): Promise<void> {
  console.log(`Approving ${amount} of token ${token} for wallet ${await signer.getAddress()} to spender ${spender}`)
  
  const tokenContract = new Contract(token, ERC20_ABI, signer);

  const tx = await tokenContract.approve(
    spender,
    amount,
  );

  await tx.wait();
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
