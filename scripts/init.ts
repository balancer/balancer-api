import {
  createPoolsTable,
  createTokensTable,
} from '../src/modules/dynamodb';
import { localAWSConfig } from '../src/modules/aws';

const AWS = require('aws-sdk');
AWS.config.update(localAWSConfig);

async function createDevTables() {
  console.log('Creating pools table');
  await createPoolsTable();
  console.log('Creating tokens table');
  await createTokensTable();
  console.log('Done');
}

createDevTables();
