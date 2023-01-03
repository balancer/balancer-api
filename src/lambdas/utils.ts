export function formatResponse(statusCode: number, body: string) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
    },
    body,
  };
}

export function isBodyValid(
  body: string | Record<string, string>,
  validFields: string[]
): boolean {
  const _body: Record<string, string> =
    typeof body === 'object' ? body : JSON.parse(body);
  const bodyFieldsWhitelist = new Set(validFields);
  const bodyKeys = Object.keys(_body);
  let isValid = true;

  bodyKeys.forEach(item => {
    if (!bodyFieldsWhitelist.has(item)) isValid = false;
  });

  return isValid;
}
