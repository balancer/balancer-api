require("dotenv").config();
import debug from "debug";
import express from "express";
import { getSorSwap } from "./sor";
import { getPool, getPools } from "./dynamodb";
import { localAWSConfig } from "./utils";

const log = debug("balancer");

const { PORT } = process.env;

const AWS = require("aws-sdk");
AWS.config.update(localAWSConfig);

const port = PORT || 8090;
const app = express();

app.get("/pools/:chainId", async (req, res, next) => {
  try {
    const chainId = Number(req.params['chainId']);
    const pools = await getPools(chainId);
    res.json(pools);
  } catch (error) {
    log(`Error: ${error.message}`);
    return next(error);
  }
});

app.get("/pools/:chainId/:id", async (req, res, next) => {
  const chainId = Number(req.params['chainId']);
  const poolId = req.params['id'];
  log(`Retrieving pool of id ${poolId}`);
  const pool = await getPool(chainId, poolId);
  if (pool) {
    return res.json(pool)
  } else {
    return res.sendStatus(404);
  }
});

app.post("/sor/:chainId", express.json(), async (req, res, next) => {
  try{
    const chainId = Number(req.params['chainId']);
    const swapInfo = await getSorSwap(chainId, req.body);
    res.json(swapInfo);
  } catch(error){
    log(`Error: ${error.message}`);
    return next(error);
  }
});

app.listen(port, () => {
  log(`Server listening at http://localhost:${port}`);
});