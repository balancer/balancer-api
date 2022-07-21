import { Price } from "@balancer-labs/sdk";
import { getPlatformId, getNativeAssetPriceSymbol } from "./utils";
import { NativeAssetId, NativeAssetPriceSymbol, Network, Token } from "./types";
import { BigNumber } from "bignumber.js";
import { COINGECKO_BASEURL, COINGECKO_MAX_TOKENS_PER_PAGE, COINGECKO_MAX_TPS } from "./constants";
import fetch from 'isomorphic-fetch';
import debug from 'debug';

const TOKEN_UPDATE_TIME = 60 * 15 * 1000; // 5 Minutes
const TOKEN_RETRY_PRICE_DATA_TIME = 24 * 60 * 60 * 7 * 1000; // 1 Week

const HTTP_ERROR_RATELIMIT = 429;

// const log = console.log;
const log = debug('balancer:price-fetcher');

interface PriceData {
  [key: string]: number;
}

interface CoinGeckoData {
  [key: string]: PriceData;
} 

class HTTPError extends Error {
  code: number;
  constructor(msg) {
    super(msg);
  }
}

class PriceFetcher {
  queue: Token[];
  tokens: Token[];
  nativeAssetPrices: Record<string, BigNumber>;
  maxTPS: number;
  lastRateLimit: number;
  rateLimitWaitTimeMS: number; 
  onCompleteCallback: () => void | null;

  constructor(private abortOnRateLimit = false)  {
    this.queue = [];
    this.tokens = [];
    this.nativeAssetPrices = {};
    this.maxTPS = COINGECKO_MAX_TPS
    this.lastRateLimit = 0;
    this.rateLimitWaitTimeMS = 90 * 1000;
    this.onCompleteCallback = null;
  }

  private async queryCoingecko(endpoint: string): Promise<CoinGeckoData> {
    const response = await fetch(COINGECKO_BASEURL + endpoint, {
      method: 'GET',
      headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
      },
    });

    log(`Received ${response.status} status code from CoinGecko`)

    if (response.status >= 400) {
      const err = new HTTPError(`Received ${response.status} status code from CoinGecko`);
      err.code = response.status;
      throw err;
    }
  
    const data = await response.json();
    return data;
  }

  private async processQueue(): Promise<void> {
    if (this.lastRateLimit > Date.now() - this.rateLimitWaitTimeMS) {
      // log(`Currently rate limited, waiting ${((this.lastRateLimit + this.rateLimitWaitTimeMS) - Date.now())/1000} more seconds`);
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    if (this.queue.length === 0) return;

    const nextChainId = this.queue[0].chainId;
    const nextBatch: Token[] = []
    while (this.queue.length > 0 && this.queue[0].chainId === nextChainId && nextBatch.length < COINGECKO_MAX_TOKENS_PER_PAGE) {
      nextBatch.push(this.queue.shift());
    }

    let coinGeckoData;
    try {
      coinGeckoData = await this.fetchPrices(nextChainId, nextBatch);
    } catch(err) {
      console.error("Got error: ", err, " reading prices from coingecko.");
      if (err.code === HTTP_ERROR_RATELIMIT) {
        if (this.abortOnRateLimit) {
          console.error("Rate limit hit, aborting.")
          return;
        }
        console.error("Error was a rate-limit. Re-adding tokens to queue.")
        this.lastRateLimit = Date.now();
        this.queue = this.queue.concat(nextBatch);
      } else if (err.code >= 500) {
        console.error("Error was a server error. Re-adding tokens to queue.")
        this.queue = this.queue.concat(nextBatch);
      }
    }

    nextBatch.forEach((token) => {
      try {
        this.updateTokenPrice(coinGeckoData, token);
      } catch (err) {
        console.error("Got error: ", err, " readding token ", token, " to queue");
        this.queue.push(token);
      }
    });

    if (this.queue.length > 0) {
      return await this.processQueue();
    }
  
  }

  private async fetchPrices(chainId, tokens: Token[]): Promise<CoinGeckoData> {
    const tokenAddresses = tokens.map(t => t.address)
    const endpoint = this.getEndpoint(chainId, tokenAddresses);
    console.log("Calling endpoint: ", endpoint);

    return await this.queryCoingecko(endpoint);
  }

  

  private getEndpoint(chainId: number, tokenAddresses: string[]) {
    const platformId = getPlatformId(chainId);
    if (!platformId) {
      const err = new HTTPError(`Unknown chain id: ${chainId}`)
      err.code = 404;
      throw err;
    }
    const endpoint = `/simple/token_price/${platformId}?contract_addresses=${tokenAddresses.join(',')}&vs_currencies=usd`;

    return endpoint;
  }

  private fetchPrice(data: CoinGeckoData, token: Token): Price {
    const nativeAssetSymbol = getNativeAssetPriceSymbol(token.chainId);

    if (data[token.address.toLowerCase()] == null || data[token.address.toLowerCase()]["usd"] == null) {
      const err = new HTTPError('No price returned from Coingecko');
      err.code = 404;
      throw err;
    }
  
    const tokenPriceInUSD = new BigNumber(data[token.address.toLowerCase()]["usd"]);
    const tokenPriceInNativeAsset = tokenPriceInUSD.div(this.nativeAssetPrices[nativeAssetSymbol]);

    return {
      'usd': tokenPriceInUSD.toString(),
      [nativeAssetSymbol]: tokenPriceInNativeAsset.toString()
    }
  }

  private updateTokenPrice(coingeckoData, token: Token): void {
    try {
      const price = this.fetchPrice(coingeckoData, token)
      token.price = price;
    } catch (err)  {
      if ((err as HTTPError).code != null) {
        console.error(`Unable to fetch price data for token ${token.symbol}. ChainID: ${token.chainId}, address ${token.address} Error code is: ${err.code}`);
        token.noPriceData = true;
      } else {
        console.error(`Encountered an error without a status code: ${err.message}`)
      }
    }

    try {
      this.tokens.push(token);
      log(`Updated token ${token.symbol} to price ${JSON.stringify(token.price)}`);
    } catch (err) {
      console.error(`Encountered error calling updateToken on ${token.symbol}: ${err.message}`);
    }
  }

  /**
   * Fetches the price of all native assets as a pre-load so that 
   * token prices on their chain can be calculated accurately
   **/
  private async fetchNativeAssetPrices() {
    const nativeAssetIds = Object.values(NativeAssetId).join(',');
    const coinGeckoQuery = `/simple/price?ids=${nativeAssetIds}&vs_currencies=usd`

    log('Fetching native prices with query: ', coinGeckoQuery);

    const coingeckoResult = await this.queryCoingecko(coinGeckoQuery);

    log('Coingecko result: ', coingeckoResult);

    Object.entries(NativeAssetId).forEach(([asset, id]) => {
      const nativeAssetSymbol = NativeAssetPriceSymbol[asset];
      log('Asset: ', asset, ' id: ', id, ' symbol: ', nativeAssetSymbol);
      this.nativeAssetPrices[nativeAssetSymbol] = new BigNumber(coingeckoResult[id]['usd']);
    });

    log("Fetched native asset prices. They are: ", JSON.stringify(this.nativeAssetPrices));
  }

  public async fetch(tokens: Token[]) {
    await this.fetchNativeAssetPrices();

    tokens.forEach((token) => {
      if (token.chainId == Network.KOVAN) return;
      if (token.price?.usd && token.lastUpdate > Date.now() - TOKEN_UPDATE_TIME) return;
      if (token.noPriceData && token.lastUpdate > Date.now() - TOKEN_RETRY_PRICE_DATA_TIME) return;

      log(`Token: ${token.symbol} has price data: ${token.noPriceData}, was last updated ${(Date.now() - token.lastUpdate)/1000} seconds ago`)
      this.queue.push(token);
    });

    this.queue.sort((a, b) => {
      return a.chainId - b.chainId;
    })

    await this.processQueue();
    return this.tokens;
  }
}

export default PriceFetcher;