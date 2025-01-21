import { BorshAccountsCoder, IdlAccounts } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Sandglass, IDL } from "./idl/sandglass";
import Decimal from "decimal.js";

export const SANDGLASS_PROGRAM_ID = new PublicKey("SANDsy8SBzwUE8Zio2mrYZYqL52Phr2WQb9DDKuXMVK");

const coder = new BorshAccountsCoder(IDL);
type MarketState = IdlAccounts<Sandglass>["market"];
type SGState = IdlAccounts<Sandglass>["sandglassAccount"];

export type ResultState = {
  address: string;
  // amount: number;
};

function setResultData(data: ResultState[], userAddress: string, _amount: number) {
  const index = data.findIndex((result) => result.address === userAddress);

  if (index === -1) {
    data = [
      {
        address: userAddress,
        // amount: amount,
      },
      ...data,
    ];
  } else {
    // data[index].amount += amount;
  }

  return data;
}

export function findSandglassAddress(marketAddress: PublicKey, walletAddress: PublicKey) {
  const sandglassAddress = PublicKey.findProgramAddressSync(
    [marketAddress.toBuffer(), walletAddress.toBuffer()],
    SANDGLASS_PROGRAM_ID
  );
  return sandglassAddress[0];
}

export async function getMarket(connection: Connection, address: PublicKey) {
  const accountInfo = await connection.getAccountInfo(address);
  const data = Buffer.from(accountInfo!.data);
  const coder = new BorshAccountsCoder(IDL);
  const market: MarketState = coder.decode("market", data);

  return market;
}

export async function getSandglassAccount(
  connection: Connection,
  marketId: PublicKey,
  marketSigner: PublicKey,
  resultPT: ResultState[],
  resultYT: ResultState[],
  resultLP: ResultState[]
) {
  const accounts = await connection.getProgramAccounts(SANDGLASS_PROGRAM_ID, {
    commitment: "processed",
    filters: [
      {
        dataSize: 416,
      },
    ],
  });

  for (const account of accounts) {
    const sandglassAccount: SGState = coder.decode("sandglassAccount", account.account.data);

    if (sandglassAccount.userAddress.toString() === marketSigner.toString()) continue;

    if (sandglassAccount.marketAccount.toString() === marketId.toString()) {
      if (Number(sandglassAccount.stakeInfo.stakePtAmount.toString()) !== 0) {
        const stakePtAmount = new Decimal(sandglassAccount.stakeInfo.stakePtAmount.toString());
        resultPT = setResultData(resultPT, sandglassAccount.userAddress.toString(), stakePtAmount.toNumber());
      } else if (Number(sandglassAccount.stakeInfo.stakeYtAmount.toString()) !== 0) {
        const stakeYtAmount = new Decimal(sandglassAccount.stakeInfo.stakeYtAmount.toString());
        resultYT = setResultData(resultYT, sandglassAccount.userAddress.toString(), stakeYtAmount.toNumber());
      } else if (Number(sandglassAccount.stakeInfo.stakeLpAmount.toString()) !== 0) {
        const stakeLpAmount = new Decimal(sandglassAccount.stakeInfo.stakeLpAmount.toString());
        resultLP = setResultData(resultLP, sandglassAccount.userAddress.toString(), stakeLpAmount.toNumber());
      }
    }
  }

  return { PT: resultPT, YT: resultYT, LP: resultLP };
}

export async function getUserTokenAmount(
  connection: Connection,
  marketSigner: PublicKey,
  mintAddress: PublicKey,
  result: ResultState[]
) {
  const tokenProgramAccounts = await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
    commitment: "processed",
    filters: [
      {
        dataSize: 165,
      },
      {
        memcmp: {
          offset: 0,
          bytes: mintAddress.toString(),
        },
      },
    ],
  });

  for (const account of tokenProgramAccounts) {
    //@ts-ignore
    if (account.account.data.parsed.info.tokenAmount.uiAmount !== 0) {
      //@ts-ignore
      const ownerAddress = account.account.data.parsed.info.owner;
      if (ownerAddress === marketSigner.toString()) continue;
      //@ts-ignore
      const tokenAmount = new Decimal(account.account.data.parsed.info.tokenAmount.amount);

      result = setResultData(result, ownerAddress, tokenAmount.toNumber());
    }
  }

  return result;
}
