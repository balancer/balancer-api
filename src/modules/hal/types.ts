type Address = string;

export enum HALEventName {
  TokensRegistered = 'TokensRegistered'
}

export interface HALEvent {
  contractAddress: Address;
  eventName: HALEventName;
  eventParameters: any;
  transaction: HALTransaction;
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

export interface TokenRegisteredEvent extends HALEvent {
  eventParameters: {
    assetManagers: Address[];
    poolId: string;
    tokens: Address[];
  }
}
