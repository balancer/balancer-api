let symbolMethod = jest.fn().mockImplementation(() => {
  return Promise.resolve('BAD');
});

let decimalsMethod = jest.fn().mockImplementation(() => {
  return Promise.resolve(2);
});

export function Contract() {
  return {
    symbol: symbolMethod,
    decimals: decimalsMethod,
  };
}

export function _setSymbolMethod(method) {
  symbolMethod = method;
}

export function _setDecimalsMethod(method) {
  decimalsMethod = method;
}
