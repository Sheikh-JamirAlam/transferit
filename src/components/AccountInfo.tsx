import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ENV, Strategy, TokenInfo, TokenListProvider } from "@solana/spl-token-registry";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { useEffect, useState } from "react";

interface TokenAccount {
  owner: string;
  mint: string;
  balance: number;
  decimalPlaces: number;
  name?: string;
  symbol?: string;
}

export default function AccountInfo() {
  const tokenAccInitialState: TokenAccount = {
    balance: 0,
    decimalPlaces: 0,
    mint: "",
    owner: "",
  };
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
  const [selectedAcc, setSelectedAcc] = useState<TokenAccount>(tokenAccInitialState);

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  useEffect(() => {
    setTokenAccounts([]);
  }, [publicKey]);

  useEffect(() => {
    new TokenListProvider().resolve(Strategy.Static).then((tokens) => {
      const tokenList = tokens.filterByChainId(ENV.Devnet).getList();

      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item);
          return map;
        }, new Map())
      );
    });
  }, []);

  useEffect(() => {
    if (!connection || !publicKey) {
      return;
    }
    getTokensInWallet(publicKey.toString(), connection);
  }, [connection, publicKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function getTokensInWallet(wallet: string, solanaConnection: Connection) {
    // Get Solana token data
    if (publicKey) {
      connection.getBalance(publicKey).then((solBalance) => {
        let solTokenAcc: TokenAccount = {
          owner: publicKey.toString(),
          mint: "SOLANA_MINT_ADDRESS",
          balance: solBalance / LAMPORTS_PER_SOL,
          decimalPlaces: 10,
          name: "Solana",
          symbol: "SOL",
        };
        setTokenAccounts((prev) => [...prev, solTokenAcc]);
      });
    }
    // Get other tokens in wallet
    const accounts = await solanaConnection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165, // number of bytes
        },
        {
          memcmp: {
            offset: 32, // number of bytes
            bytes: wallet, // base58 encoded string
          },
        },
      ],
    });

    accounts.forEach(async (account, i) => {
      let tokenAcc: TokenAccount = {
        owner: "",
        mint: "",
        balance: 0,
        decimalPlaces: 0,
      };
      const parsedAccountInfo: any = account.account.data;
      const mint = parsedAccountInfo["parsed"]["info"]["mint"];
      const decimals = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
      const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
      tokenAcc.owner = account.pubkey.toString();
      tokenAcc.mint = mint;
      tokenAcc.balance = tokenBalance;
      tokenAcc.decimalPlaces = decimals;

      // Try to fetch metadata
      try {
        const mintPubKey = new PublicKey(mint);
        let pda = await Metadata.getPDA(mintPubKey);
        let res = await Metadata.load(connection, pda);

        tokenAcc.name = res.data.data.name;
        tokenAcc.symbol = res.data.data.symbol;
      } catch (e) {
        console.error(e);
      }

      try {
        const token = tokenMap.get(mint);
        if (token) {
          tokenAcc.name = token.name;
          tokenAcc.symbol = token.symbol;
        }
      } catch (e) {
        console.error(e);
      }

      setTokenAccounts((prev) => [...prev, tokenAcc]);
    });
  }

  return (
    <div className="h-screen bg-background flex flex-col pt-24 items-center">
      <p className="text-highlight text-2xl">Transfer tokens fast and secure.</p>
      <form className="mt-12">
        <div className="grid mb-3">
          <label htmlFor="tokenSelect" className="text-teal-50 mb-2">
            Select Token:
          </label>
          <select
            name="tokenSelect"
            className="w-80 h-8 rounded outline-background"
            value={JSON.stringify(selectedAcc)}
            onChange={(e) => {
              console.log(selectedAcc);
              setSelectedAcc(JSON.parse(e.target.value));
            }}
          >
            <option key={-1} value={-1}>
              Tokens
            </option>
            {tokenAccounts.map((account, index) => (
              <option key={index} value={JSON.stringify(account)}>
                {account.name ?? `Token-${account.mint.slice(0, 10)}`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-teal-50 mb-3">
          Available Balance: {selectedAcc.balance ? `${selectedAcc.balance}` : "0"} {selectedAcc.symbol && `${selectedAcc.symbol}`}
        </p>
      </form>
    </div>
  );
}
