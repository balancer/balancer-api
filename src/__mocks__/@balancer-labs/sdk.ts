let mockSwapInfo = {
  swaps: [],
  tokenAddresses: [],
  swapAmount: 0,
  returnAmount: 0,
  returnAmountConsideringFees: 0
};

export const mockSwapCostCalculator = {
  setNativeAssetPriceInToken: jest.fn().mockImplementation()
}

export const BalancerSDK = jest.fn().mockImplementation(() => {
  return {
    sor: {
      fetchPools: jest.fn().mockImplementation(),
      getSwaps: jest.fn().mockImplementation(() => { return mockSwapInfo }),
      swapCostCalculator: mockSwapCostCalculator
    }
  };
});

export enum SwapTypes {
  SwapExactIn = 0,
  SwapExactOut = 1
}

export function _setMockSwapInfo(swapInfo) {
  mockSwapInfo = swapInfo;
}