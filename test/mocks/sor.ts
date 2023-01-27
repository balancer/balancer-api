import { BatchSwap, SwapInfo, SwapType } from '@balancer-labs/sdk';
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import { AddressZero, MaxInt256 } from '@ethersproject/constants';
import { SerializedSwapInfo, SorRequest } from '../../src/types';
import { Network, ADDRESSES } from '../../src/constants';

export const sorRequest: SorRequest = {
  sellToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
  buyToken: '0xba100000625a3754423978a60c9317c58a424e3d',
  orderKind: 'sell',
  amount: parseFixed('100', 18).toString(),
  gasPrice: BigNumber.from('0x174876e800').toString(),
};

export const sorResponse: SwapInfo = {
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

export function mockSimpleBatchSwap(userAddress): BatchSwap {
  return {
    kind: SwapType.SwapExactIn,
    swaps: [
      {
        poolId:
          '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
        assetInIndex: 0,
        assetOutIndex: 1,
        amount: '10000000000000000',
        userData: '0x',
      },
      {
        poolId:
          '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        assetInIndex: 0,
        assetOutIndex: 2,
        amount: '10000000000000000',
        userData: '0x',
      },
    ],
    assets: [
      AddressZero,
      ADDRESSES[Network.MAINNET].USDC,
      ADDRESSES[Network.MAINNET].BAL,
    ],
    funds: {
      fromInternalBalance: false,
      recipient: userAddress,
      sender: userAddress,
      toInternalBalance: false,
    },
    limits: ['20000000000000000', '0', '0'], // +ve for max to send, -ve for min to receive
    deadline: '999999999999999999', // Infinity
  };
}

export function mockSwapFromFrontend(): SwapInfo {
  return {
    swapAmount: BigNumber.from('0x3635c9adc5dea00000'),
    swapAmountForSwaps: BigNumber.from('0x3635c9adc5dea00000'),
    returnAmount: BigNumber.from('0x07fa9fd384a24799fd'),
    returnAmountFromSwaps: BigNumber.from('0x07fa9fd384a24799fd'),
    returnAmountConsideringFees: BigNumber.from('0x07bb297b53bb2ee4dd'),
    swaps: [
      {
        poolId:
          '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a',
        assetInIndex: 0,
        assetOutIndex: 1,
        amount: '1000000000000000000000',
        userData: '0x',
        returnAmount: '644323501815927922',
      },
      {
        poolId:
          '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        assetInIndex: 1,
        assetOutIndex: 2,
        amount: '0',
        userData: '0x',
        returnAmount: '147186594113357584893',
      },
    ],
    tokenAddresses: [
      '0x6b175474e89094c44da98b954eedeac495271d0f',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xba100000625a3754423978a60c9317c58a424e3d',
    ],
    tokenIn: '0x6b175474e89094c44da98b954eedeac495271d0f',
    tokenOut: '0xba100000625a3754423978a60c9317c58a424e3d',
    marketSp: '6.7814405077559605856986988999357',
    tokenInForSwaps: '0x6b175474e89094c44da98b954eedeac495271d0f',
    tokenOutFromSwaps: '0xba100000625a3754423978a60c9317c58a424e3d',
  };
}
