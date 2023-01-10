require('dotenv').config();
import {
  DomainName,
  IResource,
  LambdaIntegration,
  MockIntegration,
  PassthroughBehavior,
  RestApi,
  LogGroupLogDestination,
  AccessLogFormat,
  Model,
  HttpIntegration,
} from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Stack, RemovalPolicy, Duration, Expiration } from 'aws-cdk-lib';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import {
  GraphqlApi,
  Schema,
  AuthorizationType,
  MappingTemplate,
  DynamoDbDataSource,
} from '@aws-cdk/aws-appsync-alpha';
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import { PRODUCTION_NETWORKS } from './src/constants/general';
import { join } from 'path';
import { LogGroup } from 'aws-cdk-lib/aws-logs';

const {
  INFURA_PROJECT_ID,
  DYNAMODB_POOLS_READ_CAPACITY,
  DYNAMODB_POOLS_WRITE_CAPACITY,
  DYNAMODB_POOLS_IDX_READ_CAPACITY,
  DYNAMODB_POOLS_IDX_WRITE_CAPACITY,
  DYNAMODB_TOKENS_READ_CAPACITY,
  DYNAMODB_TOKENS_WRITE_CAPACITY,
  DECORATE_POOLS_INTERVAL_IN_MINUTES,
  DOMAIN_NAME,
  SANCTIONS_API_KEY,
  NETWORKS,
  TENDERLY_USER,
  TENDERLY_PROJECT,
  TENDERLY_ACCESS_KEY,
  SENTRY_DSN,
} = process.env;

let SELECTED_NETWORKS: Record<string, number> = PRODUCTION_NETWORKS;
if (NETWORKS) {
  const networksArray: string[] = NETWORKS.split(',');
  SELECTED_NETWORKS = Object.fromEntries(
    Object.entries(PRODUCTION_NETWORKS).filter(([name, id]) => {
      if (
        networksArray.includes(name) ||
        networksArray.includes(id.toString())
      ) {
        return true;
      }
      return false;
    })
  );
}

const POOLS_READ_CAPACITY = Number.parseInt(
  DYNAMODB_POOLS_READ_CAPACITY || '25'
);
const POOLS_WRITE_CAPACITY = Number.parseInt(
  DYNAMODB_POOLS_WRITE_CAPACITY || '25'
);
const POOLS_IDX_READ_CAPACITY = Number.parseInt(
  DYNAMODB_POOLS_IDX_READ_CAPACITY || DYNAMODB_POOLS_READ_CAPACITY || '10'
);
const POOLS_IDX_WRITE_CAPACITY = Number.parseInt(
  DYNAMODB_POOLS_IDX_WRITE_CAPACITY || DYNAMODB_POOLS_WRITE_CAPACITY || '10'
);
const TOKENS_READ_CAPACITY = Number.parseInt(
  DYNAMODB_TOKENS_READ_CAPACITY || '10'
);
const TOKENS_WRITE_CAPACITY = Number.parseInt(
  DYNAMODB_TOKENS_WRITE_CAPACITY || '10'
);

const DECORATE_POOLS_INTERVAL = Number.parseInt(
  DECORATE_POOLS_INTERVAL_IN_MINUTES || '5'
);

const BALANCER_API_KEY_EXPIRATION = Date.now() + 365 * 24 * 60 * 60 * 1000; // For GraphQL API - Maximum expiry time is 1 year

export class BalancerPoolsAPI extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    /**
     * DynamoDB Tables
     */

    const poolsTable = new Table(this, 'pools', {
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
      readCapacity: POOLS_READ_CAPACITY,
      writeCapacity: POOLS_WRITE_CAPACITY,
    });

    poolsTable.addGlobalSecondaryIndex({
      indexName: 'byTotalLiquidity',
      partitionKey: {
        name: 'chainId',
        type: AttributeType.NUMBER,
      },
      sortKey: {
        name: 'totalLiquidity',
        type: AttributeType.NUMBER,
      },
      readCapacity: POOLS_IDX_READ_CAPACITY,
      writeCapacity: POOLS_IDX_WRITE_CAPACITY,
      projectionType: ProjectionType.ALL,
    });

    const tokensTable = new Table(this, 'tokens', {
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
      readCapacity: TOKENS_READ_CAPACITY,
      writeCapacity: TOKENS_WRITE_CAPACITY,
    });

    /**
     * Lambdas
     */

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ['aws-sdk'],
      },
      environment: {
        INFURA_PROJECT_ID: INFURA_PROJECT_ID || '',
        SENTRY_DSN: SENTRY_DSN || '',
      },
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.seconds(15),
    };

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
      memorySize: 2048,
    });

    const updatePoolsLambdas: Record<number, NodejsFunction> = {};
    Object.entries(SELECTED_NETWORKS).forEach(([networkName, chainId]) => {
      const functionProps = { ...nodeJsFunctionProps };
      functionProps.environment = {
        ...functionProps.environment,
        CHAIN_ID: chainId.toString(),
      };
      updatePoolsLambdas[chainId] = new NodejsFunction(
        this,
        `updatePoolsFunction-${networkName}`,
        {
          entry: join(__dirname, 'src', 'lambdas', 'update-pools.ts'),
          ...functionProps,
          memorySize: 2048,
          timeout: Duration.seconds(300),
          reservedConcurrentExecutions: 1,
        }
      );
    });

    const decoratePoolsLambdas: Record<number, NodejsFunction> = {};
    Object.entries(SELECTED_NETWORKS).forEach(([networkName, chainId]) => {
      const functionProps = { ...nodeJsFunctionProps };
      functionProps.environment = {
        ...functionProps.environment,
        CHAIN_ID: chainId.toString(),
      };
      decoratePoolsLambdas[chainId] = new NodejsFunction(
        this,
        `decoratePoolsFunction-${networkName}`,
        {
          entry: join(__dirname, 'src', 'lambdas', 'decorate-pools.ts'),
          ...functionProps,
          memorySize: 2048,
          timeout: Duration.seconds(300),
          reservedConcurrentExecutions: 1,
        }
      );
    });

    const updateTokenPricesLambda = new NodejsFunction(
      this,
      'updateTokenPricesFunction',
      {
        entry: join(__dirname, 'src', 'lambdas', 'update-prices.ts'),
        ...nodeJsFunctionProps,
        memorySize: 512,
        timeout: Duration.seconds(60),
      }
    );

    const tenderlySimulateLambda = new NodejsFunction(
      this,
      'tenderlySimulateFunction',
      {
        entry: join(__dirname, 'src', 'lambdas', 'tenderly-simulate.ts'),
        environment: {
          TENDERLY_USER: TENDERLY_USER || '',
          TENDERLY_PROJECT: TENDERLY_PROJECT || '',
          TENDERLY_ACCESS_KEY: TENDERLY_ACCESS_KEY || '',
        },
        runtime: Runtime.NODEJS_14_X,
        timeout: Duration.seconds(15),
      }
    );

    const tenderlyEncodeStatesLambda = new NodejsFunction(
      this,
      'tenderlyEncodeStatesFunction',
      {
        entry: join(__dirname, 'src', 'lambdas', 'tenderly-encode-states.ts'),
        environment: {
          TENDERLY_USER: TENDERLY_USER || '',
          TENDERLY_PROJECT: TENDERLY_PROJECT || '',
          TENDERLY_ACCESS_KEY: TENDERLY_ACCESS_KEY || '',
        },
        runtime: Runtime.NODEJS_14_X,
        timeout: Duration.seconds(15),
      }
    );

    const checkWalletLambda = new NodejsFunction(this, 'checkWalletFunction', {
      entry: join(__dirname, 'src', 'lambdas', 'check-wallet.ts'),
      environment: {
        SANCTIONS_API_KEY: SANCTIONS_API_KEY || '',
      },
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.seconds(15),
    });

    /**
     * Lambda Schedules
     */

    const updateTokenPricesRule = new Rule(this, 'updateTokensInterval', {
      schedule: Schedule.expression('rate(2 minutes)'),
    });
    updateTokenPricesRule.addTarget(
      new LambdaFunction(updateTokenPricesLambda)
    );

    const periodWord = DECORATE_POOLS_INTERVAL > 1 ? 'minutes' : 'minute';
    const decoratePoolsRule = new Rule(this, 'decoratePoolsInterval', {
      schedule: Schedule.expression(
        `rate(${DECORATE_POOLS_INTERVAL} ${periodWord})`
      ),
    });

    Object.values(decoratePoolsLambdas).forEach(decoratePoolsLambda => {
      decoratePoolsRule.addTarget(new LambdaFunction(decoratePoolsLambda));
    });

    /**
     * Access Rules
     */

    poolsTable.grantReadData(getPoolsLambda);
    poolsTable.grantReadData(getPoolLambda);
    poolsTable.grantReadWriteData(runSORLambda);
    Object.values(updatePoolsLambdas).forEach(updatePoolsLambda => {
      poolsTable.grantReadWriteData(updatePoolsLambda);
    });
    Object.values(decoratePoolsLambdas).forEach(decoratePoolsLambda => {
      poolsTable.grantReadWriteData(decoratePoolsLambda);
    });

    tokensTable.grantReadData(getTokensLambda);
    tokensTable.grantReadWriteData(runSORLambda);
    tokensTable.grantReadWriteData(updateTokenPricesLambda);
    Object.values(decoratePoolsLambdas).forEach(decoratePoolsLambda => {
      tokensTable.grantReadData(decoratePoolsLambda);
    });
    Object.values(updatePoolsLambdas).forEach(updatePoolsLambda => {
      tokensTable.grantReadWriteData(updatePoolsLambda);
    });

    /**
     * API Gateway
     */

    const getPoolIntegration = new LambdaIntegration(getPoolLambda, {
      proxy: true,
      cacheKeyParameters: ["method.request.path.chainId", "method.request.path.id"],
      cacheNamespace: 'getPool',
      requestParameters: {
        "integration.request.path.chainId": "method.request.path.chainId",
        "integration.request.path.id": "method.request.path.id"
      }
    });
    const getPoolsIntegration = new LambdaIntegration(getPoolsLambda, {
      proxy: true,
      cacheKeyParameters: ["method.request.path.chainId"],
      cacheNamespace: 'getPools',
      requestParameters: {
        "integration.request.path.chainId": "method.request.path.chainId"
      }
    });
    const getTokensIntegration = new LambdaIntegration(getTokensLambda, {
      proxy: true,
      cacheKeyParameters: ["method.request.path.chainId"],
      cacheNamespace: 'getTokens',
      requestParameters: {
        "integration.request.path.chainId": "method.request.path.chainId"
      }
    });
    const runSORIntegration = new LambdaIntegration(runSORLambda);
    const updateTokenPricesIntegration = new LambdaIntegration(
      updateTokenPricesLambda,
      { timeout: Duration.seconds(29) }
    );
    const tenderlySimulateIntegration = new LambdaIntegration(
      tenderlySimulateLambda
    );
    const tenderlyEncodeStateIntegration = new LambdaIntegration(
      tenderlyEncodeStatesLambda
    );
    const checkWalletIntegration = new LambdaIntegration(checkWalletLambda, {
      proxy: true,
      cacheKeyParameters: ["method.request.querystring.address"],
      cacheNamespace: 'walletAddress',
      requestParameters: {
        "integration.request.querystring.address": "method.request.querystring.address"
      }
    });

    const apiGatewayLogGroup = new LogGroup(this, "ApiGatewayLogs");
    
    const api = new RestApi(this, 'poolsApi', {
      restApiName: 'Pools Service',
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(apiGatewayLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: false,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: false
        }),
        cachingEnabled: false,
        cacheClusterEnabled: true,
        methodOptions: {
          '/pools/{chainId}/GET': {
            cachingEnabled: true,
            cacheTtl: Duration.seconds(30)
          },
          '/pools/{chainId}/{id}/GET': {
            cachingEnabled: true,
            cacheTtl: Duration.seconds(30)
          },
          '/tokens/{chainId}/GET': {
            cachingEnabled: true,
            cacheTtl: Duration.seconds(30)
          },
          '/check-wallet/GET': {
            cachingEnabled: true,
            cacheTtl: Duration.minutes(60)
          }
        }
      }
    });

    const pools = api.root.addResource('pools');
    addCorsOptions(pools);

    const poolsOnChain = pools.addResource('{chainId}');
    poolsOnChain.addMethod('GET', getPoolsIntegration, { 
      requestParameters: { 
        "method.request.path.chainId": true
      }
    });

    const singlePool = poolsOnChain.addResource('{id}');
    singlePool.addMethod('GET', getPoolIntegration, { 
      requestParameters: { 
        "method.request.path.chainId": true,
        "method.request.path.id": true
      }
    });
    addCorsOptions(singlePool);

    Object.values(SELECTED_NETWORKS).forEach(networkId => {
      const updatePoolsIntegration = new LambdaIntegration(
        updatePoolsLambdas[networkId],
        { timeout: Duration.seconds(29) }
      );
      const updatePoolsWithNetworkId = pools.addResource(networkId.toString());
      const updatePools = updatePoolsWithNetworkId.addResource('update');
      addCorsOptions(updatePools);
      updatePools.addMethod('POST', updatePoolsIntegration);
    });

    const tokens = api.root.addResource('tokens');
    const tokensOnChain = tokens.addResource('{chainId}');
    tokensOnChain.addMethod('GET', getTokensIntegration, { 
      requestParameters: { 
        "method.request.path.chainId": true
      }
    });
    addCorsOptions(tokens);

    const updatePrices = tokens.addResource('update');
    updatePrices.addMethod('POST', updateTokenPricesIntegration);
    addCorsOptions(updatePrices);

    const sor = api.root.addResource('sor');
    const sorOnChain = sor.addResource('{chainId}');
    sorOnChain.addMethod('POST', runSORIntegration);
    addCorsOptions(sor);

    const gnosis = api.root.addResource('gnosis');
    const gnosisOnChain = gnosis.addResource('{chainId}');
    gnosisOnChain.addMethod('POST', runSORIntegration);
    addCorsOptions(gnosis);

    const checkWallet = api.root.addResource('check-wallet');
    checkWallet.addMethod('GET', checkWalletIntegration, { 
      requestParameters: { 
        "method.request.querystring.address": true
      }
    });
    addCorsOptions(checkWallet);

    const tenderly = api.root.addResource('tenderly');
    const tenderlySimulate = tenderly.addResource('simulate');
    tenderlySimulate.addMethod('POST', tenderlySimulateIntegration);
    addCorsOptions(tenderlySimulate);

    const tenderlyContracts = tenderly.addResource('contracts');
    const tenderlyEncodeStates = tenderlyContracts.addResource('encode-states');
    tenderlyEncodeStates.addMethod('POST', tenderlyEncodeStateIntegration);
    addCorsOptions(tenderlyEncodeStates);

    /**
     * Web Application Firewall
     */

    const rateLimits = new CfnWebACL(this, 'rateLimits', {
      name: 'RateLimits',
      description: 'Rate Limiting for API Gateway',
      defaultAction: {
        allow: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimits'
      },
      rules: [{
        name: 'BlockSpamForWalletCheck',
        priority: 0,
        statement: {
          rateBasedStatement: {
            limit: 100,
            aggregateKeyType: 'IP',
            scopeDownStatement: {
              byteMatchStatement: {
                searchString: 'wallet',
                fieldToMatch: {
                  uriPath: {}
                },
                textTransformations: [
                  {
                    priority: 0,
                    type: 'NONE'
                  }
                ],
                positionalConstraint: 'CONTAINS'
              },
            }
          }
        },
        action: {
          block: {
            customResponse: {
              responseCode: 429
            }
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'BlockSpamForWalletCheck'
        }
      },
      {
        name: 'BlockSpamForTenderly',
        priority: 1,
        statement: {
          rateBasedStatement: {
            limit: 1000,
            aggregateKeyType: 'IP',
            scopeDownStatement: {
              byteMatchStatement: {
                searchString: 'tenderly',
                fieldToMatch: {
                  uriPath: {}
                },
                textTransformations: [
                  {
                    priority: 0,
                    type: 'NONE'
                  }
                ],
                positionalConstraint: 'CONTAINS'
              },
            }
          }
        },
        action: {
          block: {
            customResponse: {
              responseCode: 429
            }
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'BlockSpamForTenderly'
        }
      }] 
    });

    /**
     * Connect WAF to API Gateway
     */

    const restApiId = api.restApiId;
    const stageName = api.deploymentStage.stageName;
    const apiGatewayArn = `arn:aws:apigateway:${this.region}:${this.account}:/restapis/${restApiId}/stages/${stageName}`;

    new CfnWebACLAssociation(this, 'apigw-waf-ratelimit-wallet-check', {
      webAclArn: rateLimits.attrArn,
      resourceArn: apiGatewayArn
    });

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
            expires: Expiration.atTimestamp(BALANCER_API_KEY_EXPIRATION),
          },
        },
      },
      xrayEnabled: true,
    });

    const poolsTableRole = new Role(this, 'PoolsDynamoDBRole', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    });

    poolsTableRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
    );

    const poolsApi = new DynamoDbDataSource(this, 'poolsApiDataSource', {
      api: graphqlApi,
      table: poolsTable,
      serviceRole: poolsTableRole,
    });

    poolsApi.createResolver({
      typeName: 'Query',
      fieldName: 'pools',
      requestMappingTemplate: MappingTemplate.fromFile(
        join(__dirname, 'appsync/pools/requestMapper.vtl')
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        join(__dirname, 'appsync/pools/responseMapper.vtl')
      ),
    });

    /**
     * ApiGateway Appsync Path
     */
    const graphQLApiEndpoint = api.root.addResource('graphql');
    graphQLApiEndpoint.addMethod('POST', new HttpIntegration(graphqlApi.graphqlUrl, {
      proxy: true,
      httpMethod: 'POST',
      options: {
        integrationResponses: [{
          statusCode: '200'
        }],
        requestParameters: {
          'integration.request.header.x-api-key': `'${graphqlApi.apiKey}'`
        }
      },
    }), {  
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': Model.EMPTY_MODEL
        }
      }]
   });
   addCorsOptions(graphQLApiEndpoint);


  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod(
    'OPTIONS',
    new MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Credentials':
              "'false'",
            'method.response.header.Access-Control-Allow-Methods':
              "'OPTIONS,GET,PUT,POST,DELETE'",
          },
        },
      ],
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }),
    {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    }
  );
}

const app = new App();
new BalancerPoolsAPI(app, 'BalancerPoolsAPI');
app.synth();
