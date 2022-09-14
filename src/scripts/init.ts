import {
  createPoolsTable,
  createTokensTable,
} from "../data-providers/dynamodb";
import { localAWSConfig } from "../utils";

const AWS = require("aws-sdk");
AWS.config.update(localAWSConfig);

async function createTables() {
  console.log("Creating pools table");
  await createPoolsTable();
  console.log("Creating tokens table");
  await createTokensTable();
  console.log("Done");
}

createTables();
