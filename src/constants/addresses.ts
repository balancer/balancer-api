import { Network } from "./general";
import { Token } from '@balancer-labs/sdk';

export interface TokenWithSlot extends Token {
  slot?: number;
}

export const ADDRESSES = {
  [Network.MAINNET]: {
    contracts: {
      vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      multicall: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
      balancerHelpers: '0x5aDDCCa35b7A0D07C74063c48700C8590E87864E',
      lidoRelayer: '0xdcdbf71A870cc60C6F9B621E28a7D3Ffd6Dd4965',
      relayerV3: '0x886A3Ec7bcC508B8795990B60Fa21f85F9dB7948',
      relayerV4: '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA',
    }
  }
}

export const TOKENS: Record<number, Record<string, TokenWithSlot>>  = {
  [Network.MAINNET]: {
    ETH: {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      symbol: 'ETH',
    },
    BAL: {
      address: '0xba100000625a3754423978a60c9317c58a424e3d',
      decimals: 18,
      symbol: 'BAL',
      slot: 1,
    },
    USDC: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: 6,
      symbol: 'USDC',
      slot: 9,
    },
    USDT: {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      decimals: 6,
      symbol: 'USDT',
      slot: 2,
    },
    WBTC: {
      address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      decimals: 8,
      symbol: 'WBTC',
      slot: 0,
    },
    renBTC: {
      address: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
      decimals: 8,
      symbol: 'renBTC',
      slot: 102,
    },
    WETH: {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      decimals: 18,
      symbol: 'WETH',
      slot: 3,
    },
    DAI: {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      decimals: 18,
      symbol: 'DAI',
      slot: 2,
    },
    STETH: {
      address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      decimals: 18,
      symbol: 'STETH',
    },
    wSTETH: {
      address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
      decimals: 18,
      symbol: 'wSTETH',
      slot: 0,
    },
    bbausd: {
      address: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2',
      decimals: 18,
      symbol: 'bbausd',
    },
    bbausd2: {
      address: '0xa13a9247ea42d743238089903570127dda72fe44',
      decimals: 18,
      symbol: 'bbausd2',
    },
    bbausdc: {
      address: '0x9210f1204b5a24742eba12f710636d76240df3d0',
      decimals: 18,
      symbol: 'bbausdc',
    },
    waDAI: {
      address: '0x02d60b84491589974263d922d9cc7a3152618ef6',
      decimals: 18,
      symbol: 'waDAI',
      slot: 52,
    },
    waUSDC: {
      address: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
      decimals: 6,
      symbol: 'waUSDC',
      slot: 52,
    },
    waUSDT: {
      address: '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58',
      decimals: 6,
      symbol: 'waUSDT',
      slot: 52,
    },
    WBTCWETH: {
      address: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',
      decimals: 18,
      symbol: 'B-50WBTC-50WETH',
      slot: 0,
    },
    auraBal: {
      address: '0x616e8bfa43f920657b3497dbf40d6b1a02d4608d',
      decimals: 18,
      symbol: 'auraBal',
      slot: 0,
    },
    BAL8020BPT: {
      address: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
      decimals: 18,
      symbol: 'BAL8020BPT',
      slot: 0,
    },
    wstETH_bbaUSD: {
      address: '0x25accb7943fd73dda5e23ba6329085a3c24bfb6a',
      decimals: 18,
      symbol: 'wstETH_bbaUSD',
      slot: 0,
    },
  }
}