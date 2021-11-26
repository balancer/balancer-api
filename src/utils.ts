import { ethers } from "ethers";
import { Contract } from '@ethersproject/contracts';
import { SwapTypes } from "@balancer-labs/sor2";
import { getToken, insertToken } from "./dynamodb";

async function getTokenInfo(provider, address: string) {
    const tokenAddress = ethers.utils.getAddress(address);
    const cachedInfo = await getToken(tokenAddress);
    if (cachedInfo !== undefined) {
        return cachedInfo;
    }

    const contract = new Contract(
        tokenAddress,
        [
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
        ],
        provider
    );
    const info = await Promise.all([
        contract
            .symbol()
            .catch(
                () => `${tokenAddress.substr(0, 4)}..${tokenAddress.substr(40)}`
            ),
        contract.decimals().then((d) => ethers.BigNumber.from(d).toNumber()),
    ]);
    const tokenInfo = {
        address: tokenAddress,
        symbol: info[0],
        decimals: info[1]
    }
    await insertToken(tokenInfo);

    return tokenInfo;
}

export async function getSymbol(provider, tokenAddress) {
    const tokenInfo = await getTokenInfo(provider, tokenAddress);
    return tokenInfo.symbol;
}
export async function getDecimals(provider, tokenAddress) {
    const tokenInfo = await getTokenInfo(provider, tokenAddress);
    return tokenInfo.decimals;
}

export function orderKindToSwapType(orderKind: string): SwapTypes {
    switch (orderKind) {
        case "sell":
            return SwapTypes.SwapExactIn;
        case "buy":
            return SwapTypes.SwapExactOut;
        default:
            throw new Error(`invalid order kind ${orderKind}`);
    }
}