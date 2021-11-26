import { getPools } from '../src/dynamodb';

export const handler = async (): Promise<any> => {
  try {
    const pools = await getPools();
    return { statusCode: 200, body: JSON.stringify(pools) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
