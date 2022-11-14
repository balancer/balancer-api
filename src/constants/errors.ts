export const MISSING_CHAIN_ID_ERROR = {
  statusCode: 400,
  body: JSON.stringify({
    error: 'You are missing the chainId',
    code: 400,
  }),
};

export const INVALID_CHAIN_ID_ERROR = {
  statusCode: 404,
  body: JSON.stringify({
    error: 'Specified chainId does not exist',
    code: 400,
  }),
};
