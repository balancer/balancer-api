import { Network } from '@/constants';
import arbitrum from './arbitrum.json';
import avalanche from './avalanche.json';
import goerli from './goerli.json';
import mainnet from './mainnet.json';
import polygon from './polygon.json';
import gnosis from './gnosis-chain.json';
import zkevm from './zkevm.json';

export interface Config {
  networkId: number;
  network: string;
  rpc: string;
  subgraph: string;
  addresses: {
    nativeAsset: string;
    wrappedNativeAsset: string;
    vault: string;
    batchRelayer: string;
    sanctionsContract?: string;
  }
  coingecko: {
    platformId: string;
    nativeAssetId: string;
    nativeAssetPriceSymbol: string;
  }
}

const config: Record<number, Config> = {
  [Network.MAINNET]: mainnet,
  [Network.GOERLI]: goerli,
  [Network.POLYGON]: polygon,
  [Network.ARBITRUM]: arbitrum,
  [Network.GNOSIS]: gnosis,
  [Network.ZKEVM]: zkevm,
  [Network.AVALANCHE]: avalanche
};

export default config;
