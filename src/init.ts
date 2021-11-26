import { createPoolsTable, createTokensTable } from "./dynamodb";

async function createTables() {
  await createPoolsTable();
  await createTokensTable();
}

createTables();