const mockTokens = {};

export const getToken = jest.fn().mockImplementation((chainId, address) => {
  return mockTokens[address];
})

/** Used by tests to inject mock data */
export function _setToken(address, token) {
  mockTokens[address] = token;
}