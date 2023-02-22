import { getRpcUrl } from "./network";

jest.mock('@/config', () => {
  return {
    1: {
      rpc: 'https://mainnet.infura.io/v3/{{INFURA_PROJECT_ID}}',
    },
    100: {
      rpc: 'https://poa-xdai.gateway.pokt.network/v1/lb/888c0e12a76e7a84dd76189d'
    }
  };
});

describe('network module', () => {
  describe('getRpcUrl', () => {
    it('Should throw an error if an invalid network id is passed', () => {
      const invalidNetworkId = 22;
      expect(() => getRpcUrl(invalidNetworkId)).toThrow();
    });

    it('Should return the rpcUrl with INFURA_PROJECT_ID in the template replaced', () => {
      expect(getRpcUrl(1)).toEqual('https://mainnet.infura.io/v3/mock-infura');
    });

    it('Should work for networks that dont use infura', () => {
      expect(getRpcUrl(100)).toEqual('https://poa-xdai.gateway.pokt.network/v1/lb/888c0e12a76e7a84dd76189d');
    });

    it('Should throw an error if the network requires INFURA_PROJECT_ID but it is not passed', () => {
      jest.resetModules()
      delete process.env.INFURA_PROJECT_ID;
      expect(() => require('./network').getRpcUrl(1)).toThrow();
    });
  });
});