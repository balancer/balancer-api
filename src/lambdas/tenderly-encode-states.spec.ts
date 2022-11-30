import nock from 'nock';
import { handler } from './tenderly-encode-states';

nock.disableNetConnect();

const tenderlyEncodeStatesResponse = {
  stateOverrides: {
    '0xba12222222228d8ba445958a75a0704d566bf2c8': {
      value: {
        '0x0eef56316c5bb4b970e1d5101f4bab0fc5a8b45e3dd89e54fb03e5c996f57f93':
          '0x0000000000000000000000000000000000000000000000000000000000000001',
      },
    },
  },
};

const request = {
  body: {
    networkID: '137',
    stateOverrides: {
      '0xBA12222222228d8Ba445958a75a0704d566BF2C8': {
        value: {
          '_approvedRelayers[0x8fE3a2A5ae6BaA201C26fC7830EB713F33d6b313][0x28A224d9d398a1eBB7BA69BCA515898966Bb1B6b]':
            'true',
        },
      },
    },
  },
};

describe('Tenderly Encode States Lambda', () => {
  beforeAll(() => {
    nock('https://api.tenderly.co')
      .post(
        '/api/v1/account/mock-user/project/mock-project/contracts/encode-states'
      )
      .reply(200, tenderlyEncodeStatesResponse);
  });
  it('Should return tenderly encode states response as it is', async () => {
    const response = await handler(request);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual(tenderlyEncodeStatesResponse);
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
