require("dotenv").config();
import debug from "debug";
import express from "express";
import { getSorSwap } from "./sor";
import { getPool, getPools } from "./dynamodb";

const log = debug("balancer");

const { PORT } = process.env;

const port = PORT || 8890;
const app = express();

app.get("/pools/", async (req, res) => {
  const pools = await getPools() ;
  res.json(pools);
});

app.get("/pools/:id", async (req, res) => {
  const poolId = req.params['id'];
  log(`Retrieving pool of id ${poolId}`);
  const pools = await getPool(poolId);
  res.json(pools);
});

app.post("/sor/", express.json(), async (req, res, next) => {
  try{
    const swapInfo = await getSorSwap(req.body);
    res.json(swapInfo);
  } catch(error){
    log(`Error: ${error.message}`);
    return next(error);
  }
});

app.listen(port, () => {
  log(`Server listening at http://localhost:${port}`);
});