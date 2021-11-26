import BigNumber from "bignumber.js";
import { JsonRpcProvider } from '@ethersproject/providers';
import { SOR, SwapInfo, SubGraphPoolsBase } from "@balancer-labs/sor2";
import { Network, Order } from "./types";
import { 
  getDecimals, 
  getSymbol, 
  orderKindToSwapType 
} from "./utils";
import { getPools } from "./dynamodb";

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const nodeUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
const chainId = Network.MAINNET;
let maxPools: number = 4;

const provider: any = new JsonRpcProvider(nodeUrl);

const log = console.log;

export async function fetchPoolsFromChain() {
  const nodeUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
  const poolsSource = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2';
  const chainId = Network.MAINNET;
  const gasPrice = new BigNumber('30000000000');
  let maxPools: number = 4;

  const provider: any = new JsonRpcProvider(nodeUrl);

  const sor = new SOR(
    provider,
    gasPrice,
    maxPools,
    chainId,
    poolsSource
  );

  await sor.fetchPools(true);  
  const pools = sor.onChainBalanceCache.pools;
  return pools;
}

export async function getSorSwap(order: Order): Promise<SwapInfo> {
  log(`Getting swap: ${JSON.stringify(order)}`);
  const sorGasPrice = new BigNumber('30000000000');

  const pools = await getPools();
  const poolsSource: SubGraphPoolsBase = {
    pools: pools
  };

  const sor = new SOR(
    provider,
    sorGasPrice,
    maxPools,
    chainId,
    poolsSource
  );

  const { sellToken, buyToken, orderKind, amount } = order;

  const tokenIn = sellToken;
  const tokenOut = buyToken;
  const swapType = orderKindToSwapType(orderKind);

  log(`fetching onChain pool info`)
  await sor.fetchPools(false);
  log(`Fetched data`);

  const amountUnits = new BigNumber(amount).dividedBy(
    new BigNumber(10).pow(
      await getDecimals(provider, orderKind === "sell" ? sellToken : buyToken)
    )
  );

  log(
    `${orderKind}ing ${amountUnits} ${await getSymbol(provider, sellToken)}` +
      ` for ${await getSymbol(provider, buyToken)}`
  );
  log(orderKind);
  log(`Token In: ${tokenIn}`);
  log(`Token In: ${tokenOut}`);
  log(`Amount: ${amountUnits.toString()}`);
  const swapInfo = await sor.getSwaps(
    sellToken,
    buyToken,
    swapType,
    amountUnits
  );

  log(`SwapInfo: ${JSON.stringify(swapInfo)}`);
  log(swapInfo.swaps);
  log(swapInfo.tokenAddresses);
  log(swapInfo.returnAmount.toString());
  return swapInfo;
}