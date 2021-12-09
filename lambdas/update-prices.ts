import { getTokens, updateToken } from "../src/dynamodb";
import { getTokenPriceInNativeAsset } from "../src/sor";

export const handler = async (): Promise<any> => {
  const log = console.log;

  try {
    log("Fetching all tokens.")
    const tokens = await getTokens();
    log(`Fetched ${tokens.length} tokens. Updating token prices`);
    await Promise.all(tokens.map(async (token) => {
      const tokenPrice = await getTokenPriceInNativeAsset(token.chainId, token.address);
      token.price = tokenPrice;
      await updateToken(token);
      log(`Updated token ${token.symbol} to price ${token.price}`);
    }));
    log("Updated token prices");
    return { statusCode: 201, body: '' };
  } catch (err) {
    log(`Received error: ${err}`);
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
