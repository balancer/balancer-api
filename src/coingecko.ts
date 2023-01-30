/**
 * A CoinGecko price fetching client that supports bulk fetching prices
 * in one query, and has a debounce function so you can push as many requests
 * as you like to it and it will handle it gracefully.
 *
 * It has a fetch function to fetch a token and then emits
 * tokens are they are complete.
 **/
import _ from 'lodash';
import { CoinGeckoClient, TokenPriceResponse } from 'coingecko-api-v3';

type Address = string;

interface CoingeckoTokenPriceFetcherOptions {
  batchSize?: number;
  debounce?: number;
}

interface CoingeckoToken {
  platformId: PlatformId;
  address: Address;
  currencies: string[];
}

interface CoingeckoPrice extends CoingeckoToken {
  prices: Record<string, number>;
}

interface CoingeckoTokenQueueOptions {
  platformId: PlatformId;
  currencies: string[];
  batchSize: number;
  debounce: number;
}

enum PlatformId {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  POLYGON = 'polygon-pos',
}

type CallbackHandler = (price: CoingeckoPrice) => any;

type CallbackType = 'price' | 'done';

class CoingeckoTokenPriceFetcher {
  batchSize: number;
  debounce: number;
  queues: CoingeckoTokenQueue[];
  callbacks: Record<CallbackType, CallbackHandler[]>;

  constructor(options: CoingeckoTokenPriceFetcherOptions) {
    const defaultOptions = {
      batchSize: 100,
      debounce: 100,
    };

    this.batchSize = options.batchSize || defaultOptions.batchSize;
    this.debounce = options.debounce || defaultOptions.debounce;
  }

  /**
   * Queues tokens to have their prices fetched from CoinGecko
   *
   * @param tokens An array of CoingeckoToken
   */
  public fetch(tokens: CoingeckoToken[]) {
    tokens.forEach(token => {
      const queue = this.getQueue(token.platformId, token.currencies);
      queue.fetch(token.address);
    });
  }

  public on(type: CallbackType, callback: CallbackHandler) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push(callback);
  }

  /**
   * Returns a Queue that is appropriate to handle this platform + currencies.
   * Pulling from existing queues or creating a new Queue if one doesn't exist.
   *
   * @param platformId
   * @param currencies
   * @returns
   */
  private getQueue(
    platformId: PlatformId,
    currencies: string[]
  ): CoingeckoTokenQueue {
    for (const queue of this.queues) {
      if (queue.isAcceptable({ platformId, currencies })) {
        return queue;
      }
    }

    const queue = new CoingeckoTokenQueue({
      platformId,
      currencies,
      batchSize: this.batchSize,
      debounce: this.debounce,
    });
    queue.on('price', this.emit.bind(this, 'price'));

    return queue;
  }

  /**
   * Emit's a price to all callbacks of a certain type
   *
   * @param type The type of callback being triggered
   * @param price The price the callback should be triggered with
   * @returns
   */
  private emit(type: CallbackType, price: CoingeckoPrice) {
    if (!this.callbacks[type]) return;

    this.callbacks[type].forEach(callback => {
      callback(price);
    });
  }
}

class CoingeckoTokenQueue {
  platformId: PlatformId;
  currencies: string[];
  batchSize: number;
  debounce: number;
  queue: Address[];
  callbacks: Record<CallbackType, CallbackHandler[]>;
  timer: ReturnType<typeof setTimeout> | undefined;
  client: CoinGeckoClient | undefined;

  constructor(options: CoingeckoTokenQueueOptions) {
    this.platformId = options.platformId;
    this.currencies = options.currencies;
    this.batchSize = options.batchSize;
    this.debounce = options.debounce;
    this.queue = [];
    this.client = new CoinGeckoClient({
      timeout: 10000,
      autoRetry: true,
    });
  }

  /** Returns if this queue is an acceptable queue given the options */
  public isAcceptable(options: Partial<CoingeckoTokenQueueOptions>): boolean {
    if (this.platformId !== options.platformId) return false;
    if (!_.isEqual(this.currencies.sort(), options.currencies.sort()))
      return false;

    return true;
  }

  /** Adds a token to the queue to be fetched */
  public fetch(address: Address) {
    this.queue.push(address);
    this.processQueue();
  }

  /**
   * Register a callback to be triggered on a new event
   *
   * @param type The type of event to listen for
   * @param callback The callback to be triggered.
   */
  public on(type: CallbackType, callback: CallbackHandler) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push(callback);
  }

  private processQueue() {
    if (this.queue.length >= this.batchSize) {
      return this.batchFetch();
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(this.batchFetch.bind(this), this.debounce);
  }

  private async batchFetch() {
    const itemsToFetch = this.queue.splice(0, this.batchSize);
    try {
      const results = await this.client.simpleTokenPrice({
        id: 'ethereum',
        contract_addresses: itemsToFetch.join(','),
        vs_currencies: this.currencies.join(','),
      });
      this.processResults(results);
      if (this.queue.length === 0) {
        this.emit('done');
      }
    } catch (e) {
      console.error('Encountered error fetching prices:', e);
    }
  }

  private processResults(results: TokenPriceResponse) {
    Object.entries(results).forEach(([address, prices]) => {
      const price: CoingeckoPrice = {
        address,
        platformId: this.platformId,
        currencies: Object.keys(prices),
        prices,
      }
      this.emit('price', price);
    });
  }

  /**
   * Emit's a price to all callbacks of a certain type
   *
   * @param type The type of callback being triggered
   * @param price The price the callback should be triggered with
   * @returns
   */
  private emit(type: CallbackType, price?: CoingeckoPrice) {
    if (!this.callbacks[type]) return;

    this.callbacks[type].forEach(callback => {
      callback(price);
    });
  }
}
