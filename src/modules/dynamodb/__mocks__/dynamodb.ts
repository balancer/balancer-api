const mockTokens = {};
const mockPools = {};

export const getToken = jest.fn().mockImplementation((chainId, address) => {
  return mockTokens[address];
});

export const getPool = jest.fn().mockImplementation((chainId, address) => {
  return mockPools[address];
})

export const getPools = jest.fn().mockImplementation(() => {
  return Object.values(mockPools);
})

/** Used by tests to inject mock data */
export function _setToken(address, token) {
  mockTokens[address] = token;
}

export function _setPool(address, pool) {
  mockPools[address] = pool;
}
