import { PublicKey, Connection } from "@solana/web3.js";
import { getMarket, getSandglassAccount, getUserTokenAmount } from "./util";
import type { ResultState } from "./util";
import fs from "fs";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const SANDGLASS_MARKET_ID = new PublicKey("");
const OUTPUT_FILENAME = "output.json";

const connection = new Connection(RPC_URL, "processed");

async function main() {
  const sandglassMarket = await getMarket(connection, SANDGLASS_MARKET_ID);

  let resultPT: ResultState[] = [];
  let resultYT: ResultState[] = [];
  let resultLP: ResultState[] = [];

  const result = await getSandglassAccount(
    connection,
    SANDGLASS_MARKET_ID,
    sandglassMarket.marketSigner,
    resultPT,
    resultYT,
    resultLP
  );
  resultPT = result.PT;
  resultYT = result.YT;
  resultLP = result.LP;

  resultPT = await getUserTokenAmount(
    connection,
    sandglassMarket.marketSigner,
    sandglassMarket.tokenPtMintAddress,
    resultPT
  );
  resultYT = await getUserTokenAmount(
    connection,
    sandglassMarket.marketSigner,
    sandglassMarket.tokenYtMintAddress,
    resultYT
  );
  resultLP = await getUserTokenAmount(
    connection,
    sandglassMarket.marketSigner,
    sandglassMarket.tokenLpMintAddress,
    resultLP
  );

  const output = JSON.stringify({ PT: resultPT, YT: resultYT, LP: resultLP }, null, 1);
  fs.writeFileSync(OUTPUT_FILENAME, output);
}

main();
