require("dotenv").config();
import debug from "debug";
import express from "express";
import { getSorSwap } from "./sor";
import { getPool, getPools, getToken, getTokens } from "./data-providers/dynamodb";
import { isValidChainId, localAWSConfig } from "./utils";
import { handler as getPoolsHandler } from "./lambdas/get-pools";
import { handler as getPoolHandler } from "./lambdas/get-pool";
import { handler as sorHandler } from "./lambdas/run-sor";
import { handler as getTokensHandler } from './lambdas/get-tokens';

const log = debug("balancer");

const { PORT } = process.env;

const AWS = require("aws-sdk");
AWS.config.update(localAWSConfig);

const port = PORT || 8090;
const app = express();

app.get("/pools/:chainId", async (req, res) => {
  const result = await getPoolsHandler({
      pathParameters: req.params
  });
  res.status(result.statusCode).send(result.body);
});

app.get("/pools/:chainId/:id", async (req, res) => {
  const result = await getPoolHandler({
    pathParameters: req.params
  });
  res.status(result.statusCode).send(result.body);
});

app.post("/sor/:chainId", express.json(), async (req, res) => {
  const result = await sorHandler({
    pathParameters: req.params,
    body: req.body
  });
  res.status(result.statusCode).send(result.body);
});

app.get("/tokens/:chainId", async (req, res) => {
  const result = await getTokensHandler({
    pathParameters: req.params
  });
  res.status(result.statusCode).send(result.body);
});

app.get("/tokens/:chainId/:id", async (req, res) => {
  const chainId = Number(req.params['chainId']);
  const tokenId = req.params['id'];
  log(`Retrieving token of id ${tokenId}`);
  const token = await getToken(chainId, tokenId);
  if (token) {
    return res.json(token)
  } else {
    return res.sendStatus(404);
  }
});

const server = app.listen(port, () => {
  log(`Server listening at http://localhost:${port}`);
});

export default server;