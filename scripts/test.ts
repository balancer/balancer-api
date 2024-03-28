console.log('Running test.ts!');
import { handler } from '../src/lambdas/check-wallet';

(async () => {
  try {
    console.log('Fetching pools...');
    const response = await handler({
      queryStringParameters: {
        address: '0x356226e2f6D49749FD5F0fa5656acF86b20F3485',
      },
    });
    console.log('handler response:', response);
  } catch (e) {
    console.log(e);
  }
})();
