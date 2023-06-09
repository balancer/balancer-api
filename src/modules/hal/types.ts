type Address = string;

export enum HALEventName {
  TokensRegistered = 'TokensRegistered'
}

export interface HALEvent {
  contractAddress: Address;
  eventName: HALEventName;
  eventParameters: HALEventParameters
  transaction: HALTransaction;
}

export interface HALEventParameters {
  assetManagers: Address[];
  poolId: string;
  tokens: Address[];
}

export interface HALTransaction {
  blockHash: string;
  blockNumber: number;
  blockTimestamp: number;
  from: Address;
  to: Address;
  hash: string;
  value: string | null;
  inputData: string;
}
