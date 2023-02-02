import { TokenWithSlot } from '../../src/constants/addresses';
import { hexlify, zeroPad } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { JsonRpcSigner } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Token, Address } from '@balancer-labs/sdk';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

const ERC20_ABI = require('./ERC20.json');

export async function getBalances(
  signer: JsonRpcSigner,
  walletAddress: string,
  tokens: Token[]
): Promise<Record<string, string>> {
  const balances = await Promise.all(
    tokens.map(async token => {
      const contract = new Contract(token.address, ERC20_ABI, signer);
      const balance = await contract.balanceOf(walletAddress);
      return [token.symbol, balance];
    })
  );

  const ethBalance = await signer.getBalance();
  balances.unshift(['ETH', ethBalance]);

  return Object.fromEntries(balances);
}

export async function printBalances(
  signer: JsonRpcSigner,
  walletAddress: string,
  tokens: Token[]
): Promise<void> {
  const balances = await getBalances(signer, walletAddress, tokens);
  console.log('Token Balances:');
  Object.entries(balances).forEach(([symbol, balance]) => {
    console.log(`${symbol}: ${balance}`);
  });
}

/**
 * Setup local fork with approved token balance for a given account
 *
 * @param {JsonRpcSigner} signer Account that will have token balance set and approved
 * @param {string[]}      tokens Token addresses which balance will be set and approved
 * @param {number[]}      slots Slot that stores token balance in memory - use npm package `slot20` to identify which slot to provide
 * @param {string[]}      balances Balances in EVM amounts
 * @param {string}        jsonRpcUrl Url with remote node to be forked locally
 * @param {number}        blockNumber Number of the block that the fork will happen
 */
export const forkSetup = async (
  signer: JsonRpcSigner,
  jsonRpcUrl: string,
  blockNumber?: number
): Promise<void> => {
  await signer.provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl,
        blockNumber,
      },
    },
  ]);
};

/**
 * Set token balance for a given account
 *
 * @param {JsonRpcSigner} signer Account that will have token balance set
 * @param {string}        token Token address which balance will be set
 * @param {number}        slot Slot memory that stores balance - use npm package `slot20` to identify which slot to provide
 * @param {string}        balance Balance in EVM amounts
 */
export const setTokenBalance = async (
  signer: JsonRpcSigner,
  token: TokenWithSlot,
  balance: BigNumberish,
  isVyperMapping = false
): Promise<void> => {
  const toBytes32 = (bn: BigNumber) => {
    return hexlify(zeroPad(bn.toHexString(), 32));
  };

  const setStorageAt = async (token: string, index: string, value: string) => {
    await signer.provider.send('hardhat_setStorageAt', [token, index, value]);
    await signer.provider.send('evm_mine', []); // Just mines to the next block
  };

  const signerAddress = await signer.getAddress();

  // Get storage slot index
  let index;
  if (isVyperMapping) {
    index = keccak256(
      ['uint256', 'uint256'],
      [token.slot, signerAddress] // slot, key
    );
  } else {
    index = keccak256(
      ['uint256', 'uint256'],
      [signerAddress, token.slot] // key, slot
    );
  }

  // Manipulate local balance (needs to be bytes32 string)
  await setStorageAt(
    token.address,
    index,
    toBytes32(BigNumber.from(balance)).toString()
  );
};

export async function approveToken(
  signer: JsonRpcSigner,
  token: Address,
  amount: BigNumberish,
  spender: Address
): Promise<void> {
  console.log(
    `Approving ${amount} of token ${token} for wallet ${await signer.getAddress()} to spender ${spender}`
  );

  const tokenContract = new Contract(token, ERC20_ABI, signer);

  const tx = await tokenContract.approve(spender, amount);

  await tx.wait();
}
