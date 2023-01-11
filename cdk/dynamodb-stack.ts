import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, Table, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

type TableName = 'pools' | 'tokens';

export interface DynamoDBStackProps extends StackProps {
    capacity: {
        pools: {
            general: {
                read: number;
                write: number;
            },
            byTotalLiquidity: {
                read: number;
                write: number;
            }
        },
        tokens: {
            general: {
                read: number;
                write: number;
            }
        }
    }
}

export class DynamoDBStack extends Stack {
    public readonly tables: Record<TableName, Table>

    constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
        super(scope, id, props);

        
    /**
     * DynamoDB Tables
     */

    this.tables['pools'] = new Table(this, 'pools', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'chainId',
        type: AttributeType.NUMBER,
      },
      tableName: 'pools',
      removalPolicy: RemovalPolicy.DESTROY,
      readCapacity: props.capacity.pools.general.read,
      writeCapacity: props.capacity.pools.general.write,
    });
  
    this.tables['pools'].addGlobalSecondaryIndex({
      indexName: 'byTotalLiquidity',
      partitionKey: {
        name: 'chainId',
        type: AttributeType.NUMBER,
      },
      sortKey: {
        name: 'totalLiquidity',
        type: AttributeType.NUMBER,
      },
      readCapacity: props.capacity.pools.byTotalLiquidity.read,
      writeCapacity: props.capacity.pools.byTotalLiquidity.write,
      projectionType: ProjectionType.ALL,
    });

    this.tables['tokens'] = new Table(this, 'tokens', {
      partitionKey: {
        name: 'address',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'chainId',
        type: AttributeType.NUMBER,
      },
      tableName: 'tokens',
      removalPolicy: RemovalPolicy.DESTROY,
      readCapacity: props.capacity.tokens.general.read,
      writeCapacity: props.capacity.tokens.general.write,
    });
  
  }


}