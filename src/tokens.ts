import { updateToken } from "./dynamodb";
import { getPlatformId, getNativeAssetId } from "./utils";
import { Network, Token } from "./types";

const TOKEN_UPDATE_TIME = 60 * 15 * 1000; // 5 Minutes
const TOKEN_RETRY_PRICE_DATA_TIME = 24 * 60 * 7 * 1000; // 1 Week

const COINGECKO_MAX_TPS = 10;

const HTTP_ERROR_RATELIMIT = 429;

const log = console.log;

class HTTPError extends Error {
  code: number;
  constructor(msg) {
    super(msg);
  }
}

class TokenFetcher {
  queue: Token[];
  activeThreads: number;
  maxThreads: number;
  maxTPS: number;
  availableTransactions: number;
  lastRateLimit: number;
  rateLimitWaitTimeMS: number; 
  onCompleteCallback: () => void | null;

  constructor(private abortOnRateLimit = false)  {
    this.queue = [];
    this.activeThreads = 0;
    this.maxThreads = 5;
    this.maxTPS = COINGECKO_MAX_TPS
    this.availableTransactions = COINGECKO_MAX_TPS;
    this.lastRateLimit = 0;
    this.rateLimitWaitTimeMS = 90 * 1000;
    this.onCompleteCallback = null;
    this.fillTokenBucket();
  }

  private fillTokenBucket() {
    this.availableTransactions++;
    const waitTime = 1000 / this.maxTPS;
    setTimeout(() => this.fillTokenBucket(), waitTime);
  }


  private getEndpoint(chainId: number, tokenAddress: string) {
    const endpointBase = 'https://api.coingecko.com/api/v3/simple/token_price/';
    const platformId = getPlatformId(chainId);
    const nativeAssetId = getNativeAssetId(chainId);
    const endpoint = `${endpointBase}${platformId}?contract_addresses=${tokenAddress}&vs_currencies=${nativeAssetId}`;

    return endpoint;
  }

  private async fetchPrice(token: Token): Promise<string> {
    this.availableTransactions--;

    const nativeAssetId = getNativeAssetId(token.chainId);
    const endpoint = this.getEndpoint(token.chainId, token.address);
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
      },
    });

    if (response.status >= 400) {
      const err = new HTTPError(`Received ${response.status} status code from CoinGecko`);
      err.code = response.status;
      throw err;
    }
  
    const data = await response.json();
  
    if (data[token.address.toLowerCase()] == null || data[token.address.toLowerCase()][nativeAssetId] == null) {
      const err = new HTTPError('No price returned from Coingecko');
      err.code = 404;
      throw err;
    }
  
    return data[token.address.toLowerCase()][nativeAssetId];
  }

  private async updateTokenPrice(token: Token): Promise<void> {
    log(`Updating price of token: ${token.symbol}`);
    try {
      const price = await this.fetchPrice(token)
      token.price = price;
    } catch (err)  {
      if ((err as HTTPError).code != null) {
        if (err.code === HTTP_ERROR_RATELIMIT) {
          log(`Hit rate limit`);
          if (this.abortOnRateLimit) {
            return this.abort();
          }
          this.lastRateLimit = Date.now();
          throw new Error("Rate Limited");
        } else {
          log(`Unable to fetch price data for token ${token.symbol}. ChainID: ${token.chainId}, address ${token.address} Error code is: ${err.code}`);
          token.noPriceData = true;
        }
      } else {
        console.error(`Encountered an error without a status code: ${err.message}`)
      }
    }

    try {
      await updateToken(token);
      log(`Updated token ${token.symbol} to price ${token.price}`);
    } catch (err) {
      console.error(`Encountered error calling updateToken on ${token.symbol}: ${err.message}`);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.activeThreads >= this.maxThreads || this.activeThreads >= this.queue.length) {
      // log(`${this.activeThreads} active threads, max is: ${this.maxThreads}. Returning`);
      return;
    }
    if (this.lastRateLimit > Date.now() - this.rateLimitWaitTimeMS) {
      log(`Currently rate limited, waiting ${((this.lastRateLimit + this.rateLimitWaitTimeMS) - Date.now())/1000} more seconds`);
      setTimeout(() => this.processQueue(), 1000);
      return;
    }
    if (this.availableTransactions <= 0) {
      // log(`Not enough available transactions to send a request right now`);
      const waitTime = 1000 / this.maxTPS;
      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

    this.activeThreads++;

    const token: Token = this.queue.shift();
    try {
      await this.updateTokenPrice(token);
    } catch (err) {
      this.queue.push(token);
    }

    this.activeThreads--;
    log(`${this.queue.length} items remaining. Active threads: ${this.activeThreads}`);
    if (this.queue.length === 0 && this.activeThreads === 0 && this.onCompleteCallback) {
      return this.onCompleteCallback();
    }
    setTimeout(() => this.processQueue());
  }

  private async startProcessing() {
    const totalThreads = (this.maxThreads - this.activeThreads);
    log(`Creating ${totalThreads} threads`);
    for (let i = 0; i < totalThreads; i++) {
      setTimeout(() => this.processQueue());
    }
  }

  public fetchPrices(tokens: Token[]) {
    tokens.forEach((token) => {
      if (token.chainId == Network.KOVAN || token.chainId == Network.POLYGON) return;
      if (token.lastUpdate > Date.now() - TOKEN_UPDATE_TIME) return;
      if (token.noPriceData && token.lastUpdate > Date.now() - TOKEN_RETRY_PRICE_DATA_TIME) return;

      log(`Token: ${token.symbol} has price data: ${token.noPriceData}, was last updated ${(Date.now() - token.lastUpdate)/1000} seconds ago`)
      this.queue.push(token);
    });

    this.startProcessing();
  }

  public onComplete() {
    const promise = new Promise((resolve) => {
      this.onCompleteCallback = () => resolve("");
    });
    return promise;
  }

  public abort() {
    log(`Aborting`);
    this.maxThreads = 0;
    this.queue = [];
    if (this.onCompleteCallback){
      this.onCompleteCallback();
    }
  }
}

export async function updateTokenPrices(tokens: Token[], abortOnRateLimit = false) {
  const tokenFetcher = new TokenFetcher(abortOnRateLimit)
  log(`fetching prics for ${tokens.length} tokens`)
  tokenFetcher.fetchPrices(tokens);
  log('waiting for completion')
  await tokenFetcher.onComplete() 
}
