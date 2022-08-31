require("dotenv").config();
import { DomainName, IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Stack, RemovalPolicy, Duration, Expiration } from 'aws-cdk-lib';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Certificate  } from 'aws-cdk-lib/aws-certificatemanager';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { GraphqlApi, Schema, AuthorizationType, MappingTemplate, DynamoDbDataSource } from '@aws-cdk/aws-appsync-alpha';
import { join } from 'path'

const { 
  INFURA_PROJECT_ID, 
  DYNAMODB_POOLS_READ_CAPACITY, 
  DYNAMODB_POOLS_WRITE_CAPACITY,
  DYNAMODB_TOKENS_READ_CAPACITY, 
  DYNAMODB_TOKENS_WRITE_CAPACITY,
  DOMAIN_NAME,
  SANCTIONS_API_KEY
} = process.env;

const POOLS_READ_CAPACITY = Number.parseInt(DYNAMODB_POOLS_READ_CAPACITY || '25');
const POOLS_WRITE_CAPACITY = Number.parseInt(DYNAMODB_POOLS_WRITE_CAPACITY || '25');
const TOKENS_READ_CAPACITY = Number.parseInt(DYNAMODB_TOKENS_READ_CAPACITY || '10');
const TOKENS_WRITE_CAPACITY = Number.parseInt(DYNAMODB_TOKENS_WRITE_CAPACITY || '10');

const BALANCER_API_KEY_EXPIRATION = Date.now() + (365 * 24 * 60 * 60 * 1000); // For GraphQL API - Maximum expiry time is 1 year

export class BalancerPoolsAPI extends Stack {
  constructor(app: App, id: string) {
    super(app, id);
    
    /**
     * DynamoDB Tables
     */

    const poolsTable = new Table(this, 'pools', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'chainId',
        type: AttributeType.NUMBER
      },
      tableName: 'pools',
      removalPolicy: RemovalPolicy.DESTROY,
      readCapacity: POOLS_READ_CAPACITY,
      writeCapacity: POOLS_WRITE_CAPACITY
    });

    poolsTable.addGlobalSecondaryIndex({
      indexName: 'byTotalLiquidity',
      partitionKey: {
        name: 'chainId', 
        type: AttributeType.NUMBER
      },
      sortKey: {
        name: 'totalLiquidity', 
        type: AttributeType.NUMBER
      },
      readCapacity: POOLS_READ_CAPACITY,
      writeCapacity: POOLS_WRITE_CAPACITY,
      projectionType: ProjectionType.ALL,
    });

    const tokensTable = new Table(this, 'tokens', {
      partitionKey: {
        name: 'address',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'chainId',
        type: AttributeType.NUMBER
      },
      tableName: 'tokens',
      removalPolicy: RemovalPolicy.DESTROY,
      readCapacity: TOKENS_READ_CAPACITY,
      writeCapacity: TOKENS_WRITE_CAPACITY
    });

    /**
     * Lambdas
     */

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', 
        ],
      },
      environment: {
        INFURA_PROJECT_ID: INFURA_PROJECT_ID || '',
      },
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.seconds(15)
    }

    const getPoolLambda = new NodejsFunction(this, 'getPoolFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'get-pool.ts'),
      ...nodeJsFunctionProps,
    });
    const getPoolsLambda = new NodejsFunction(this, 'getPoolsFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'get-pools.ts'),
      ...nodeJsFunctionProps,
    });
    const getTokensLambda = new NodejsFunction(this, 'getTokensFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'get-tokens.ts'),
      ...nodeJsFunctionProps,
    });
    const runSORLambda = new NodejsFunction(this, 'runSORFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'run-sor.ts'),
      ...nodeJsFunctionProps,
      memorySize: 2048
    });
    const updatePoolsLambda = new NodejsFunction(this, 'updatePoolsFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'update-pools.ts'),
      ...nodeJsFunctionProps,
      memorySize: 2048,
      timeout: Duration.seconds(60),
      reservedConcurrentExecutions: 1
    });

    const decoratePoolsLambda = new NodejsFunction(this, 'decoratePoolsFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'decorate-pools.ts'),
      ...nodeJsFunctionProps,
      ...{
        environment: {
          // DEBUG: 'balancer:pool*',
          INFURA_PROJECT_ID: INFURA_PROJECT_ID || '',
        }
      },
      memorySize: 2048,
      timeout: Duration.seconds(60),
      reservedConcurrentExecutions: 1
    });
    
    const updateTokenPricesLambda = new NodejsFunction(this, 'updateTokenPricesFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'update-prices.ts'),
      ...nodeJsFunctionProps,
      memorySize: 512,
      timeout: Duration.seconds(60)
    });

    const walletCheckLambda = new NodejsFunction(this, 'walletCheckFunction', {
        entry: join(__dirname, 'src', 'lambdas', 'wallet-check.ts'),
        environment: {
          SANCTIONS_API_KEY: SANCTIONS_API_KEY || ''
        },
        runtime: Runtime.NODEJS_14_X,
        timeout: Duration.seconds(15)
    });

    /** 
     * Lambda Schedules
     */

    const rule = new Rule(this, 'updateEachMinute', {
      schedule: Schedule.expression('rate(1 minute)')
    });

    rule.addTarget(new LambdaFunction(updateTokenPricesLambda))
    rule.addTarget(new LambdaFunction(decoratePoolsLambda))

    /**
     * Access Rules
     */

    poolsTable.grantReadData(getPoolsLambda);
    poolsTable.grantReadData(getPoolLambda);
    poolsTable.grantReadWriteData(runSORLambda);
    poolsTable.grantReadWriteData(updatePoolsLambda);
    poolsTable.grantReadWriteData(decoratePoolsLambda);

    tokensTable.grantReadData(getTokensLambda);
    tokensTable.grantReadData(decoratePoolsLambda);
    tokensTable.grantReadWriteData(runSORLambda);
    tokensTable.grantReadWriteData(updatePoolsLambda);
    tokensTable.grantReadWriteData(updateTokenPricesLambda);

    /**
     * API Gateway
     */

    const getPoolIntegration = new LambdaIntegration(getPoolLambda);
    const getPoolsIntegration = new LambdaIntegration(getPoolsLambda);
    const getTokensIntegration = new LambdaIntegration(getTokensLambda);
    const runSORIntegration = new LambdaIntegration(runSORLambda);
    const updatePoolsIntegration = new LambdaIntegration(updatePoolsLambda, {timeout: Duration.seconds(29)});
    const updateTokenPricesIntegration = new LambdaIntegration(updateTokenPricesLambda, {timeout: Duration.seconds(29)});
    const walletCheckIntegration = new LambdaIntegration(walletCheckLambda);

    const api = new RestApi(this, 'poolsApi', {
      restApiName: 'Pools Service'
    });

    const pools = api.root.addResource('pools');
    const poolsOnChain = pools.addResource('{chainId}')
    poolsOnChain.addMethod('GET', getPoolsIntegration);
    addCorsOptions(pools);

    const updatePools = pools.addResource('update');
    updatePools.addMethod('POST', updatePoolsIntegration);
    addCorsOptions(updatePools);

    const singlePool = poolsOnChain.addResource('{id}');
    singlePool.addMethod('GET', getPoolIntegration);
    addCorsOptions(singlePool);

    const tokens = api.root.addResource('tokens');
    const tokensOnChain = tokens.addResource('{chainId}');
    tokensOnChain.addMethod('GET', getTokensIntegration);
    addCorsOptions(tokens);

    const updatePrices = tokens.addResource('update');
    updatePrices.addMethod('POST', updateTokenPricesIntegration);
    addCorsOptions(updatePrices);

    const sor = api.root.addResource('sor');
    const sorOnChain = sor.addResource('{chainId}')
    sorOnChain.addMethod('POST', runSORIntegration);
    addCorsOptions(sor);

    const gnosis = api.root.addResource('gnosis');
    const gnosisOnChain = gnosis.addResource('{chainId}')
    gnosisOnChain.addMethod('POST', runSORIntegration);
    addCorsOptions(gnosis);

    const walletCheck = api.root.addResource('wallet-check');
    walletCheck.addMethod('POST', walletCheckIntegration);
    addCorsOptions(walletCheck);

    /**
     * Subdomain
     */
    if (DOMAIN_NAME) {
      const domainName = DOMAIN_NAME;
      const domain = new DomainName(this, 'domain-name', {
          domainName,
          certificate: new Certificate(this, 'Cert', { domainName }),
      });

      domain.addBasePathMapping(api);
    }

    /**
     * AppSync API
     */
    const graphqlApi = new GraphqlApi(this, 'Api', {
      name: 'poolsApi',
      schema: Schema.fromAsset(join(__dirname, 'appsync/pools/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.API_KEY,
          apiKeyConfig: {
            name: 'BalancerAPIKey',
            expires: Expiration.atTimestamp(BALANCER_API_KEY_EXPIRATION)
          }
        },
      },
      xrayEnabled: true,
    });

    const poolsTableRole = new Role(this, 'PoolsDynamoDBRole', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com')
    });

    poolsTableRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));

    const poolsApi = new DynamoDbDataSource(this, 'poolsApiDataSource', {
      api: graphqlApi,
      table: poolsTable,
      serviceRole: poolsTableRole
    });
    
    poolsApi.createResolver({
      typeName: 'Query',
      fieldName: 'pools',
      requestMappingTemplate: MappingTemplate.fromFile(join(__dirname, 'appsync/pools/requestMapper.vtl')),
      responseMappingTemplate: MappingTemplate.fromFile(join(__dirname, 'appsync/pools/responseMapper.vtl'))
    });
  }
 }

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}

const app = new App();
new BalancerPoolsAPI(app, 'BalancerPoolsAPI');
app.synth();
