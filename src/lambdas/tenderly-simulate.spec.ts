import nock from 'nock';
import { handler } from './tenderly-simulate';

nock.disableNetConnect();

const tenderlySimulateResponse = {
  transaction: {
    hash: '0xffffff6b166c358506d3de01e1f9b4691ba38cb797ae000ce26dda9cac5de30f',
    block_hash: '',
    block_number: 35997827,
    from: '0x8fe3a2a5ae6baa201c26fc7830eb713f33dfffff',
    gas: 9223372036854776000,
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
      .post(
        '/api/v1/account/mock-user/project/mock-project/contracts/encode-states'
      )
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
