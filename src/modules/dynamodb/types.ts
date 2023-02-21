
export interface Schema {
  [key: string]: {
    type:
      | 'BigDecimal'
      | 'BigInt'
      | 'Boolean'
      | 'Int'
      | 'String'
      | 'Object'
      | 'Array';
    static: boolean;
  };
}

export interface UpdateExpression {
  UpdateExpression: string;
  ExpressionAttributeNames: { [key: string]: string };
  ExpressionAttributeValues: { [key: string]: any };
}
