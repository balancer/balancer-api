export interface Transaction {
  blockHash: string;
  blockNumber: string;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  from: string;
  gasUsed: string;
  gasUsedForL1?: string;
  l1BlockNumber?: string;
  logs: TransactionLog[];
  logsBloom: string;
  status: string;
  to: string;
  transactionHash: string;
  transactionIndex: string;
  type: string;
}

export interface MatchReason {
  type: string;
  signature: string;
  address: string;
  args: any[];
  params: any;
}

export interface TokensRegisteredMatchReason extends MatchReason {
  params: {
    poolId: string;
    tokens: string[];
    assetManagers: string[];
  };
}

export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  logIndex: string;
  removed: boolean;
}

export interface Sentinel {
  id: string;
  name: string;
  abi: any;
  addresses: string[];
  confirmBlocks: number;
  network: string;
  chainId: number;
}
