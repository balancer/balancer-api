let symbolMethod = jest.fn().mockImplementation(() => {
  return Promise.resolve('BAD');
});

let decimalsMethod = jest.fn().mockImplementation(() => {
  return Promise.resolve(2);
});

let versionMethod = jest.fn().mockImplementation(() => {
  return Promise.resolve(
    JSON.stringify({
      name: 'ComposableStablePool',
      version: 3,
      deployment: '20230206-composable-stable-pool-v3',
    })
  );
});

export function Contract() {
  return {
    symbol: symbolMethod,
    decimals: decimalsMethod,
    version: versionMethod,
  };
}

export function _setSymbolMethod(method) {
  symbolMethod = method;
}

export function _setDecimalsMethod(method) {
  decimalsMethod = method;
}

export function _setVersionMethod(method) {
  versionMethod = method;
}
