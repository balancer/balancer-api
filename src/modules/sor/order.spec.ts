import config from "@/config";
import { TOKENS } from "@/constants";
import { parseFixed } from "@ethersproject/bignumber";
import { createSorOrder } from "./order";

jest.mock('@balancer-labs/sdk');
jest.mock('@/modules/dynamodb/dynamodb');

const networkId = 1;
let sorRequest;

describe('sor/order', () => {
  describe('createSorOrder', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      sorRequest = {
        sellToken: TOKENS[networkId].ETH.address,
        buyToken: TOKENS[networkId].BAL.address,
        amount: parseFixed('1', 18).toString(),
        orderKind: 'sell',
        gasPrice: parseFixed('10', 9).toString(),
        sender: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      };
      require('@balancer-labs/sdk')._setEncodedBatchSwap('0x945bcec9000000ffffffffffff444be97813ea77ac')
      require('@/modules/dynamodb/dynamodb')._setToken(TOKENS[networkId].ETH.address, {
        ...TOKENS[networkId].ETH,
        price: {
          usd: '2500',
          eth: '1'
        }
      });
      require('@/modules/dynamodb/dynamodb')._setToken(TOKENS[networkId].BAL.address, {
        ...TOKENS[networkId].BAL,
        price: {
          usd: '25',
          eth: '0.01'
        }
      })
    });

    describe('Batch Swaps', () => {
      it('Should return a valid order', async () => {
        const sorOrder = await createSorOrder(networkId, sorRequest);
        expect(sorOrder.to).toEqual(config[networkId].addresses.vault);
        expect(sorOrder.data.length).toBeGreaterThan(10);
        expect(sorOrder.value).toBe('0');
      });
    });

    describe('Join/Exit Relayer Swaps', () => {
      it('Should return a valid batchRelayer order', async () => {
        require('@balancer-labs/sdk')._setIsJoinExitSwap(true);
        const sorOrder = await createSorOrder(networkId, sorRequest);
        expect(sorOrder.to).toEqual(config[networkId].addresses.batchRelayerV4);
        expect(sorOrder.data.length).toBeGreaterThan(10);
        expect(sorOrder.value).toBe('0');
      });
    });

    describe('Error Handling', () => {
      it('Should throw an error if you do not pass a sender in the request', async () => {
        delete sorRequest.sender;
        expect(async() => { await createSorOrder(networkId, sorRequest) }).rejects.toThrow('To create a SOR order you must pass a sender address in the request');
      });

      it('Should throw an error if you pass slippagePercentage as a string', async () => {
        sorRequest.slippagePercentage = "0.02";
        expect(async() => { await createSorOrder(networkId, sorRequest) }).rejects.toThrow('slippagePercentage must be a number');
      });

      it('Should throw an error if you pass a slippagePercentage greater than one', async () => {
        sorRequest.slippagePercentage = 1.1;
        expect(async() => { await createSorOrder(networkId, sorRequest) }).rejects.toThrow('Invalid slippage percentage. Must be 0 < n < 1.');
      });

      it('Should throw an error if you pass a slippagePercentage less than zero', async () => {
        sorRequest.slippagePercentage = -0.3;
        expect(async() => { await createSorOrder(networkId, sorRequest) }).rejects.toThrow('Invalid slippage percentage. Must be 0 < n < 1.');
      });
    });
  });
});