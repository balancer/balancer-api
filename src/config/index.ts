import { Network } from '@balancer-labs/sdk';

import arbitrum from './arbitrum.json';
import goerli from './goerli.json';
import mainnet from './mainnet.json';
import polygon from './polygon.json';
import gnosis from './gnosis-chain.json';

export interface Config {
  networkId: Network;
  rpc: string;
  subgraph: string;
}

const config: Record<Network | number, Config> = {
  [Network.MAINNET]: mainnet,
  [Network.GOERLI]: goerli,
  [Network.POLYGON]: polygon,
  [Network.ARBITRUM]: arbitrum,
  [Network.GNOSIS]: gnosis
};

export default config;
