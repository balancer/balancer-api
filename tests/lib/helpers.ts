import config from '@/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { TokenWithSlot } from '@/constants/addresses';
import { hexlify, hexValue, zeroPad } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { JsonRpcSigner } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Token, Address } from '@sobal/sdk';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Network } from '@/constants';

const ERC20ABI = require('./abis/ERC20.json');

export async function getBalances(
  signer: JsonRpcSigner,
  tokens: Token[]
): Promise<Record<string, string>> {
  const balances = await Promise.all(
    tokens.map(async token => {
      const contract = new Contract(token.address, ERC20ABI, signer);
      const balance = await contract.balanceOf(await signer.getAddress());
      return [token.symbol, balance];
    })
  );

  const ethBalance = await signer.getBalance();
  balances.unshift(['ETH', ethBalance]);

  return Object.fromEntries(balances);
}

export async function printBalances(
  signer: JsonRpcSigner,
  tokens: Token[]
): Promise<void> {
  const balances = await getBalances(signer, tokens);
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

export async function setEthBalance(
  signer: JsonRpcSigner,
  balance: BigNumberish
) {
  const walletAddress = await signer.getAddress();

  const params = [
    walletAddress,
    hexValue(balance), // hex encoded wei amount
  ];

  await signer.provider.send('hardhat_setBalance', params);
}

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
  const tokenContract = new Contract(token, ERC20ABI, signer);

  const tx = await tokenContract.approve(spender, amount);

  await tx.wait();
}

export async function approveRelayer(signer: JsonRpcSigner): Promise<void> {
  const walletAddress = await signer.getAddress();
  const vaultAddress = config[Network.MAINNET].addresses.vault;
  const relayerAddress = config[Network.MAINNET].addresses.batchRelayer;
  const vaultContract = new Contract(vaultAddress, Vault__factory.abi, signer);
  await vaultContract.setRelayerApproval(walletAddress, relayerAddress, true);
}
