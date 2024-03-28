console.log('Running test.ts!');
import { handler } from '../src/lambdas/check-wallet';

(async () => {
  try {
    console.log('Fetching pools...');
    const response = await handler({
      queryStringParameters: {
        address: '0x7f367cc41522ce07553e823bf3be79a889debe1b',
      },
    });
    console.log('handler response:', response);
  } catch (e) {
    console.log(e);
  }
})();
