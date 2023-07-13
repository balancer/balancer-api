import { Pool as SDKPool } from '@sobal/sdk';

export interface Pool extends SDKPool {
  chainId: number;
  graphData?: {
    totalLiquidity?: string;
  };
  lastUpdate?: number;
  managementFee?: string;
  mainIndex?: number;
  wrappedIndex?: number;
  maxApr?: number;
}
