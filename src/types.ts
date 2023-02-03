import { Pool as SDKPool, SwapV2, Token as SDKToken } from '@balancer-labs/sdk';

export interface Order {
  sellToken: string;
  buyToken: string;
  orderKind: string;
  amount: string;
  gasPrice: string;
}

export interface Token extends SDKToken {
  chainId: number;
  lastUpdate?: number;
  noPriceData?: boolean;
}

export interface SerializedSwapInfo {
  tokenAddresses: string[];
  swaps: SwapV2[];
  swapAmount: string;
  swapAmountForSwaps?: string;
  returnAmount: string;
  returnAmountFromSwaps?: string;
  returnAmountConsideringFees: string;
  tokenIn: string;
  tokenOut: string;
  marketSp: string;
}

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

export interface SorRequest {
  sellToken: string;
  buyToken: string;
  orderKind: 'sell' | 'buy';
  amount: string;
  gasPrice: string;
}

export interface Schema {
  [key: string]: {
    type:
      | 'BigDecimal'
      | 'BigInt'
      | 'Boolean'
      | 'Int'
      | 'String'
      | 'Object'
      | 'Array';
    static: boolean;
  };
}

export interface UpdateExpression {
  UpdateExpression: string;
  ExpressionAttributeNames: { [key: string]: string };
  ExpressionAttributeValues: { [key: string]: any };
}
export interface TRMAccountDetails {
  accountExternalId: string | null;
  address: string;
  addressRiskIndicators: TRMRiskIndicator[];
  addressSubmitted: string;
  chain: string;
  entities: TRMEntity[];
  trmAppUrl: string;
}

export interface TRMRiskIndicator {
  category: string;
  categoryId: string;
  categoryRiskScoreLevel: number;
  categoryRiskScoreLevelLabel: string;
  incomingVolumeUsd: string;
  outgoingVolumeUsd: string;
  riskType: string;
  totalVolumeUsd: string;
}

export interface TRMEntity {
  category: string;
  categoryId: string;
  entity: string;
  riskScoreLevel: number;
  riskScoreLevelLabel: string;
  trmAppUrl: string;
  trmUrn: string;
}
