import supertest from 'supertest';
import { createPoolsTable, createTokensTable, deleteTable } from './dynamodb';
import server from './server';

beforeAll(async () => {
  console.log("Checking DynamoDB is running...");
  console.log("Setting up DynamoDB...");
  await createPoolsTable();
  await createTokensTable();
  console.log("Running tests...");
});

describe('server.ts', () => {

  describe('GET /pools/:chainId', () => {
    it('Should return the pools on Ethereum', async () => {
      const response = await supertest(server).get('/pools/1')
      expect(response.status).toEqual(200);
    });
  });

  describe("POST /sor/:chainId", () => {

    it.skip("Should return swap information", async () => {
      await supertest(server).post("/sor/1")
        .expect(200)
        .then((response) => {
          console.log(response)
          expect(response).toBeTruthy();
        });
    });
    
  });

});

afterAll(async () => {
  await deleteTable('pools');
  await deleteTable('tokens');
  server.close();
})