import { getRpcUrl, getSubgraphUrl } from './network';

jest.mock('@/config', () => {
  return {
    1: {
      rpc: 'https://mainnet.infura.io/v3/{{INFURA_PROJECT_ID}}',
    },
    100: {
      rpc: 'https://poa-xdai.gateway.pokt.network/v1/lb/888c0e12a76e7a84dd76189d',
    },
    1101: {
      rpc: 'https://polygonzkevm-mainnet.g.alchemy.com/v2/{{ALCHEMY_KEY}}',
      subgraph: 'string-with-{{SUBGRAPH_API_KEY}}',
    },
  };
});

describe('network module', () => {
  describe('getSubgraphUrl', () => {
    it('should replace template value with a key', () => {
      expect(getSubgraphUrl(1101)).toEqual('string-with-mock-subgraph-api-key');
    });
  });

  describe('getRpcUrl', () => {
    it('Should throw an error if an invalid network id is passed', () => {
      const invalidNetworkId = 22;
      expect(() => getRpcUrl(invalidNetworkId)).toThrow();
    });

    it('Should return the rpcUrl with INFURA_PROJECT_ID in the template replaced', () => {
      expect(getRpcUrl(1)).toEqual('https://mainnet.infura.io/v3/mock-infura');
    });

    it('Should return the rpcUrl with ALCHEMY_KEY in the template replaced', () => {
      expect(getRpcUrl(1101)).toEqual(
        'https://polygonzkevm-mainnet.g.alchemy.com/v2/mock-alchemy'
      );
    });

    it('Should work for networks that dont use infura', () => {
      expect(getRpcUrl(100)).toEqual(
        'https://poa-xdai.gateway.pokt.network/v1/lb/888c0e12a76e7a84dd76189d'
      );
    });

    it('Should throw an error if the network requires INFURA_PROJECT_ID but it is not passed', () => {
      jest.resetModules();
      delete process.env.INFURA_PROJECT_ID;
      expect(() => require('./network').getRpcUrl(1)).toThrow();
    });

    it('Should throw an error if the network requires ALCHEMY_KEY but it is not passed', () => {
      jest.resetModules();
      delete process.env.ALCHEMY_KEY;
      expect(() => require('./network').getRpcUrl(1101)).toThrow();
    });

    it('Should work for networks that dont use infura without INFURA_PROJECT_ID set', () => {
      jest.resetModules();
      delete process.env.INFURA_PROJECT_ID;
      expect(getRpcUrl(100)).toEqual(
        'https://poa-xdai.gateway.pokt.network/v1/lb/888c0e12a76e7a84dd76189d'
      );
    });
  });
});
