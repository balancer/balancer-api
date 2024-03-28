import nock from 'nock';
import { handler } from './check-wallet';

nock.disableNetConnect();

const request = {
  queryStringParameters: {
    address: '0x0000000000000000000000000000000000000000',
  },
};

const goodResponse = {
  data: [
    {
      address: '0x0000000000000000000000000000000000000000',
      recommendation: 'Approve',
      flags: [],
    },
  ],
};

const badResponse = {
  data: [
    {
      address: '0x0000000000000000000000000000000000000000',
      recommendation: 'Deny',
      flags: [
        {
          title: 'Blacklisted by circle (USDC)',
          valence: 'Negative',
          flagId: 'F-1401',
          chain: 'ethereum',
          lastUpdate: '2018-12-28T15:36:24Z',
          events: [Array],
        },
        {
          title: 'Received from OFAC-sanctioned',
          valence: 'Negative',
          flagId: 'F-1102',
          chain: 'gnosis',
          lastUpdate: '2024-03-19T22:06:55Z',
          events: [Array],
        },
        {
          title: 'Sent to OFAC-sanctioned',
          valence: 'Negative',
          flagId: 'F-1103',
          chain: 'gnosis',
          lastUpdate: '2024-01-22T09:57:45Z',
          events: [Array],
        },
      ],
    },
  ],
};

describe('Wallet Check Lambda', () => {
  it('Should return false for an address with no issues', async () => {
    nock('https://api.hypernative.xyz')
      .post('/auth/login')
      .reply(200, { data: { token: 'token' } });
    nock('https://api.hypernative.xyz')
      .post('/assets/reputation/addresses')
      .reply(200, goodResponse);
    const response = await handler(request);
    console.log('Response:', response);
    const body = JSON.parse(response.body);
    expect(body.is_blocked).toBe(false);
  });

  it('Should return blocked for an address that has a Severe risk', async () => {
    nock('https://api.hypernative.xyz')
      .post('/auth/login')
      .reply(200, { data: { token: 'token' } });
    nock('https://api.hypernative.xyz')
      .post('/assets/reputation/addresses')
      .reply(200, badResponse);
    const response = await handler(request);
    const body = JSON.parse(response.body);
    expect(body.is_blocked).toBe(true);
  });
});
