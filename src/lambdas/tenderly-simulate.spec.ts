import nock from 'nock';
import { handler } from './tenderly-simulate';

nock.disableNetConnect();

const tenderlySimulateResponse = {
  transaction: {
    transaction_info: {
      call_trace: {
        output: '0x00000000000000000021b043d58ce81f6',
      },
    },
  },
};

const request = {
  body: {
    network_id: '137',
    from: '0x8fe3a2a5ae6baa201c26fc7830eb713f33dfffff',
    to: '0x28A224d9d398a1eBB7BA69BCA515898966Bb1B6b',
    input: '0xac9650d800000000000000000',
  },
};

describe('Tenderly Simulate Lambda', () => {
  beforeAll(() => {
    nock('https://api.tenderly.co')
      .post('/api/v1/account/mock-user/project/mock-project/simulate')
      .reply(200, tenderlySimulateResponse);
  });

  it('Should return tenderly simulate response as it is', async () => {
    const response = await handler(request);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual(tenderlySimulateResponse);
  });

  it('Should return 400 if request body is missing', async () => {
    const response = await handler({ body: null });
    expect(response.statusCode).toBe(400);
    const response2 = await handler({ body: undefined });
    expect(response2.statusCode).toBe(400);
  });

  it('Should return 400 if request body contains fields outside of whitelist', async () => {
    const response = await handler({
      body: { ...request.body, extra: "I'm not allowed" },
    });
    expect(response.statusCode).toBe(400);
  });
});
