require("dotenv").config();
import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { Runtime } from '@aws-cdk/aws-lambda';
import { App, Stack, RemovalPolicy, Duration } from '@aws-cdk/core';
import { NodejsFunction, NodejsFunctionProps } from '@aws-cdk/aws-lambda-nodejs';
import { join } from 'path'

const { INFURA_PROJECT_ID } = process.env;

export class BalancerPoolsAPI extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    const poolsTable = new Table(this, 'pools', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      tableName: 'pools',
      removalPolicy: RemovalPolicy.DESTROY,
      readCapacity: 100,
      writeCapacity: 100
    });

    const tokensTable = new Table(this, 'tokens', {
      partitionKey: {
        name: 'address',
        type: AttributeType.STRING
      },
      tableName: 'tokens',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', 
        ],
      },
      environment: {
        INFURA_PROJECT_ID,
      },
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.seconds(15)
    }

    const getPoolLambda = new NodejsFunction(this, 'getPoolFunction', {
      entry: join(__dirname, 'lambdas', 'get-pool.ts'),
      ...nodeJsFunctionProps,
    });
    const getPoolsLambda = new NodejsFunction(this, 'getPoolsFunction', {
      entry: join(__dirname, 'lambdas', 'get-pools.ts'),
      ...nodeJsFunctionProps,
    });
    const runSORLambda = new NodejsFunction(this, 'runSORFunction', {
      entry: join(__dirname, 'lambdas', 'run-sor.ts'),
      ...nodeJsFunctionProps,
      memorySize: 256
    });
    const updatePoolsLambda = new NodejsFunction(this, 'updatePoolsFunction', {
      entry: join(__dirname, 'lambdas', 'update.ts'),
      ...nodeJsFunctionProps,
      memorySize: 512,
      timeout: Duration.seconds(60)
    });

    poolsTable.grantReadData(getPoolsLambda);
    poolsTable.grantReadData(getPoolLambda);
    poolsTable.grantReadWriteData(runSORLambda);
    poolsTable.grantReadWriteData(updatePoolsLambda);

    tokensTable.grantReadWriteData(runSORLambda);

    const getPoolsIntegration = new LambdaIntegration(getPoolsLambda);
    const updatePoolsIntegration = new LambdaIntegration(updatePoolsLambda, {timeout: Duration.seconds(29)});
    const getPoolIntegration = new LambdaIntegration(getPoolLambda);
    const runSORIntegration = new LambdaIntegration(runSORLambda);

    const api = new RestApi(this, 'poolsApi', {
      restApiName: 'Pools Service'
    });

    const pools = api.root.addResource('pools');
    pools.addMethod('GET', getPoolsIntegration);
    addCorsOptions(pools);

    const update = pools.addResource('update');
    update.addMethod('POST', updatePoolsIntegration);
    addCorsOptions(update);

    const singlePool = pools.addResource('{id}');
    singlePool.addMethod('GET', getPoolIntegration);
    addCorsOptions(singlePool);

    const sor = api.root.addResource('sor');
    sor.addMethod('POST', runSORIntegration);
    addCorsOptions(sor);
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
