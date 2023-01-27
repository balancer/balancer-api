
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

  console.log('Transferring ', parseFixed(BigNumber.from(tokenAmount).toString(), 18), ' to ', walletAddress);
  const respTxTransfer = await tokenContract.transferFrom(
    ADMIN_ADDRESS,
    walletAddress,
    tokenAmount
  );

  await respTxTransfer.wait();

  console.log('Transfer: ', respTxTransfer);
}

export async function approveToken (
  token: string,
  amount: string,
  signer: JsonRpcSigner
): Promise<boolean> {
  console.log('Approving token ', token);
  const tokenContract = new Contract(token, ERC20_ABI, signer);
  return await tokenContract
    .connect(signer)
    .approve(ADDRESSES[Network.MAINNET].contracts.vault, amount);
}
