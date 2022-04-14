import nock from 'nock';

import { Network, Token } from './types';
import PriceFetcher from './price-fetcher';
import { COINGECKO_BASEURL } from './constants';


/**
 * Token Prices (USD)
 * ETH: 2500
 * DAI: 1
 * MATIC: 2
 * BAL: 25
 * TEL: 0.005
 */
const TOKEN_ADDRESSES = {};
TOKEN_ADDRESSES[Network.MAINNET] = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  BAL: '0xba100000625a3754423978a60c9317c58a424e3d',
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  MATIC: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
  TEL: '0x467bccd9d29f223bce8043b84e8c8b282827790f',
  INVALID: '0x1234567890123456789012345678901234567890',
  MALFORMED: '0x1234HGKL',
}
TOKEN_ADDRESSES[Network.POLYGON] = {
  BAL: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
  DAI: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  TEL: '0xdF7837DE1F2Fa4631D716CF2502f8b230F1dcc32',
}
TOKEN_ADDRESSES[Network.ARBITRUM] = {
  BAL: '0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8',
  DAI: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
}

describe("Price Fetcher", () => {
  let priceFetcher;

  beforeEach(() => {
    priceFetcher = new PriceFetcher();

    nock(COINGECKO_BASEURL)
      .get(`/ethereum?contract_addresses=${TOKEN_ADDRESSES[Network.MAINNET].MATIC}&vs_currencies=eth`)
      .reply(200, {
        [TOKEN_ADDRESSES[Network.MAINNET].MATIC]: {
          "eth": 0.0008
        }
      });
  });

  describe("Ethereum Network", () => {
    it("Should fetch the price of one token", async () => {
      const tokens: Token[] = [{
        symbol: 'DAI',
        address: TOKEN_ADDRESSES[Network.MAINNET].DAI,
        chainId: Network.MAINNET,
        decimals: 18,
        price: null
      }];

      nock(COINGECKO_BASEURL)
        .get(`/ethereum?contract_addresses=${TOKEN_ADDRESSES[Network.MAINNET].DAI}&vs_currencies=eth`)
        .reply(200, {
          [TOKEN_ADDRESSES[Network.MAINNET].DAI]: {
            "eth": 0.0004
          }
        });

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices[0].price).toEqual('2500'); // ETH price in DAI
    });

    it("Should fetch two tokens from Ethereum", async () => {
      const tokens: Token[] = [{
        symbol: 'BAL',
        address: TOKEN_ADDRESSES[Network.MAINNET].BAL,
        chainId: Network.MAINNET,
        decimals: 18,
        price: null
      }, {
        symbol: 'USDC',
        address: TOKEN_ADDRESSES[Network.MAINNET].USDC,
        chainId: Network.MAINNET,
        decimals: 6,
        price: null
      }];

      nock(COINGECKO_BASEURL)
        .get(`/ethereum?contract_addresses=${tokens.map(t => t.address).join(',')}&vs_currencies=eth`)
        .reply(200, {
          [TOKEN_ADDRESSES[Network.MAINNET].BAL]: {
            "eth": 0.01
          },
          [TOKEN_ADDRESSES[Network.MAINNET].USDC]: {
            "eth": 0.0004
          }
        });

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices[0].price).toEqual('100'); // ETH price in BAL
      expect(tokensWithPrices[1].price).toEqual('2500'); // ETH price in USDC
    });

    it("Should handle invalid tokens gracefully", async () => {
      const tokens: Token[] = [{
        symbol: 'INVALID',
        address: TOKEN_ADDRESSES[Network.MAINNET].INVALID,
        chainId: Network.MAINNET,
        decimals: 18,
        price: null
      }];

      nock(COINGECKO_BASEURL)
        .get(`/ethereum?contract_addresses=${TOKEN_ADDRESSES[Network.MAINNET].INVALID}&vs_currencies=eth`)
        .reply(200, {});

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices[0].price).toEqual(null);
      expect(tokensWithPrices[0].noPriceData).toEqual(true);
    });

    it("Should handle malformed addresses gracefully", async () => {
      const tokens: Token[] = [{
        symbol: 'MALFORMED',
        address: TOKEN_ADDRESSES[Network.MAINNET].MALFORMED,
        chainId: Network.MAINNET,
        decimals: 18,
        price: null
      }];

      nock(COINGECKO_BASEURL)
        .get(`/ethereum?contract_addresses=${TOKEN_ADDRESSES[Network.MAINNET].MALFORMED}&vs_currencies=eth`)
        .reply(200, {});

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices[0].price).toEqual(null);
      expect(tokensWithPrices[0].noPriceData).toEqual(true);
    });

    it("Should not re-request information for a token that has just been updated", async () => {
      const tokens: Token[] = [{
        symbol: 'DAI',
        address: TOKEN_ADDRESSES[Network.MAINNET].DAI,
        chainId: Network.MAINNET,
        decimals: 18,
        price: '2200',
        lastUpdate: Date.now() - 100
      }];

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices.length).toEqual(0);
    });

    it("Should not re-request information for an unknown token within a week", async () => {
      const tokens: Token[] = [{
        symbol: 'INVALID',
        address: TOKEN_ADDRESSES[Network.MAINNET].INVALID,
        chainId: Network.MAINNET,
        decimals: 18,
        price: null,
        noPriceData: true,
        lastUpdate: Date.now() - (3 * 86400  * 1000)
      }];

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices.length).toEqual(0);
    });
  });

  describe("Polygon Network", () => {
    it("Should fetch the price of one token", async () => {
      const tokens: Token[] = [{
        symbol: 'TEL',
        address: TOKEN_ADDRESSES[Network.POLYGON].TEL,
        chainId: Network.POLYGON,
        decimals: 2,
        price: null
      }];

      nock(COINGECKO_BASEURL)
        .get(`/polygon-pos?contract_addresses=${TOKEN_ADDRESSES[Network.POLYGON].TEL}&vs_currencies=eth`)
        .reply(200, {
          [TOKEN_ADDRESSES[Network.POLYGON].TEL.toLowerCase()]: {
            "eth": 0.000002
          }
        });

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices[0].price).toEqual('400'); // MATIC price in TEL
    });
  });

  describe("Cross Network", () => {
    it("Should fetch three tokens from Ethereum, Polygon, Arbitrum", async () => {
      const mainnetTokens: Token[] = [{
        symbol: 'BAL',
        address: TOKEN_ADDRESSES[Network.MAINNET].BAL,
        chainId: Network.MAINNET,
        decimals: 18,
        price: null
      },{
        symbol: 'DAI',
        address: TOKEN_ADDRESSES[Network.MAINNET].DAI,
        chainId: Network.MAINNET,
        decimals: 18,
        price: null
      }]
      const polygonTokens: Token[] = [{
        symbol: 'BAL',
        address: TOKEN_ADDRESSES[Network.POLYGON].BAL,
        chainId: Network.POLYGON,
        decimals: 18,
        price: null
      },{
        symbol: 'DAI',
        address: TOKEN_ADDRESSES[Network.POLYGON].DAI,
        chainId: Network.POLYGON,
        decimals: 18,
        price: null
      }]
      const arbitrumTokens: Token[] = [{
        symbol: 'BAL',
        address: TOKEN_ADDRESSES[Network.ARBITRUM].BAL,
        chainId: Network.ARBITRUM,
        decimals: 18,
        price: null
      }, {
        symbol: 'DAI',
        address: TOKEN_ADDRESSES[Network.ARBITRUM].DAI,
        chainId: Network.ARBITRUM,
        decimals: 18,
        price: null
      }];

      nock(COINGECKO_BASEURL)
        .get(`/ethereum?contract_addresses=${mainnetTokens.map(t => t.address).join(',')}&vs_currencies=eth`)
        .reply(200, {
          [TOKEN_ADDRESSES[Network.MAINNET].BAL]: {
            "eth": 0.01
          },
          [TOKEN_ADDRESSES[Network.MAINNET].DAI]: {
            "eth": 0.0004
          }
        });

      nock(COINGECKO_BASEURL)
        .get(`/polygon-pos?contract_addresses=${polygonTokens.map(t => t.address).join(',')}&vs_currencies=eth`)
        .reply(200, {
          [TOKEN_ADDRESSES[Network.POLYGON].BAL]: {
            "eth": 0.01
          },
          [TOKEN_ADDRESSES[Network.POLYGON].DAI]: {
            "eth": 0.0004
          }
        });

      nock(COINGECKO_BASEURL)
        .get(`/arbitrum-one?contract_addresses=${arbitrumTokens.map(t => t.address).join(',')}&vs_currencies=eth`)
        .reply(200, {
          [TOKEN_ADDRESSES[Network.ARBITRUM].BAL]: {
            "eth": 0.01
          },
          [TOKEN_ADDRESSES[Network.ARBITRUM].DAI]: {
            "eth": 0.0004
          }
        });

      const tokens = [].concat(mainnetTokens).concat(polygonTokens).concat(arbitrumTokens);
      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices[0].price).toEqual('100'); // ETH price in BAL
      expect(tokensWithPrices[1].price).toEqual('2500'); // ETH price in DAI
      expect(tokensWithPrices[2].price).toEqual('0.08'); // MATIC price in BAL
      expect(tokensWithPrices[3].price).toEqual('2'); // MATIC price in DAI
      expect(tokensWithPrices[4].price).toEqual('100'); // ETH price in BAL
      expect(tokensWithPrices[5].price).toEqual('2500'); // ETH price in DAI
    });

    it("Should handle tokens with an invalid chainID gracefully", async () => {
      const tokens: Token[] = [{
        symbol: 'INVALID',
        address: TOKEN_ADDRESSES[Network.MAINNET].INVALID,
        chainId: 111,
        decimals: 18,
        price: null
      }];

      const tokensWithPrices = await priceFetcher.fetch(tokens);
      expect(tokensWithPrices[0].price).toEqual(null);
    });
  });

  afterAll(() => {
    nock.cleanAll();
  })  

});
