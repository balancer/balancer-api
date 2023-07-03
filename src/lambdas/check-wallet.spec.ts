import { handler } from './check-wallet';

const SANCTIONED_ADDRESS = '0x7F367cC41522cE07553e823bf3be79A889DEbe1B';

jest.mock(
  '@/modules/sanctions',
  jest.fn().mockImplementation(() => {
    return {
      isSanctioned: address => {
        if (address === SANCTIONED_ADDRESS) return true;
        return false;
      },
    };
  })
);

describe('Wallet Check Lambda', () => {
  it('Should return false for an address with no issues', async () => {
    const request = {
      queryStringParameters: {
        address: '0x0000000000000000000000000000000000000000',
      },
    };

    const response = await handler(request);
    const body = JSON.parse(response.body);
    expect(body.is_blocked).toBe(false);
  });

  it('Should return blocked for an address that is on the sanctions list', async () => {
    const request = {
      queryStringParameters: {
        address: SANCTIONED_ADDRESS,
      },
    };

    const response = await handler(request);
    const body = JSON.parse(response.body);
    expect(body.is_blocked).toBe(true);
  });
});
