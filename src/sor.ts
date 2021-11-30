import BigNumber from "bignumber.js";
import { JsonRpcProvider } from '@ethersproject/providers';
import { SOR, SwapInfo, SubgraphPoolBase } from "@balancer-labs/sor";
import { Network, Order } from "./types";
import { 
  getDecimals, 
  getSymbol, 
  orderKindToSwapType,
  getInfuraUrl,
  getTheGraphURL
} from "./utils";
import { getPools } from "./dynamodb";

const { INFURA_PROJECT_ID } = process.env;


const log = console.log;

export async function fetchPoolsFromChain(chainId: number): Promise<SubgraphPoolBase[]> {
  const poolsSource = getTheGraphURL(chainId);
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);

  const sor = new SOR(
    provider,
    chainId,
    poolsSource
  );

  await sor.fetchPools();  
  const pools: SubgraphPoolBase[] = sor.getPools();
  return pools;
}

export async function getSorSwap(chainId: number, order: Order): Promise<SwapInfo> {
  log(`Getting swap: ${JSON.stringify(order)}`);
  const infuraUrl = getInfuraUrl(chainId);
  const provider: any = new JsonRpcProvider(infuraUrl);
  const pools: SubgraphPoolBase[] = await getPools(chainId);

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
      await getDecimals(provider, chainId, orderKind === "sell" ? sellToken : buyToken)
    )
  );

  log(
    `${orderKind}ing ${amountUnits} ${await getSymbol(provider, chainId, sellToken)}` +
      ` for ${await getSymbol(provider, chainId, buyToken)}`
  );
  log(orderKind);
  log(`Token In: ${tokenIn}`);
  log(`Token Out: ${tokenOut}`);
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