import BigNumber from "bignumber.js";
import { JsonRpcProvider } from '@ethersproject/providers';
import { SOR, SwapInfo, SubgraphPoolBase } from "@balancer-labs/sor";
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

export async function fetchPoolsFromChain(): Promise<SubgraphPoolBase[]> {
  const nodeUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
  const poolsSource = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2';
  const chainId = Network.MAINNET;

  const provider: any = new JsonRpcProvider(nodeUrl);

  const sor = new SOR(
    provider,
    chainId,
    poolsSource
  );

  await sor.fetchPools();  
  const pools: SubgraphPoolBase[] = sor.getPools();
  return pools;
}

export async function getSorSwap(order: Order): Promise<SwapInfo> {
  log(`Getting swap: ${JSON.stringify(order)}`);
  const sorGasPrice = new BigNumber('30000000000');

  const pools: SubgraphPoolBase[] = await getPools();

  const sor = new SOR(
    provider,
    chainId,
    null,
    pools
  );

  const { sellToken, buyToken, orderKind, amount } = order;

  const tokenIn = sellToken;
  const tokenOut = buyToken;
  const swapType = orderKindToSwapType(orderKind);

  log(`fetching onChain pool info`)
  await sor.fetchPools(pools, false);
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
    amountUnits.toString()
  );

  log(`SwapInfo: ${JSON.stringify(swapInfo)}`);
  log(swapInfo.swaps);
  log(swapInfo.tokenAddresses);
  log(swapInfo.returnAmount.toString());
  return swapInfo;
}