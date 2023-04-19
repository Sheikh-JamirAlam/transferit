import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection, LAMPORTS_PER_SOL, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TokenAccountNotFoundError,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { ENV, Strategy, TokenInfo, TokenListProvider } from "@solana/spl-token-registry";
import { WalletSendTransactionError } from "@solana/wallet-adapter-base";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { useEffect, useState } from "react";
import TokenAccCreateModal from "./TokenAccCreateModal";
import TokenTransferModal from "./TokenTransferModal";
import TransferSuccess from "./TransferSuccess";

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
  const [transferAmount, setTransferAmount] = useState(0);
  const [receiverAddress, setReceiverAddress] = useState("");
  const [isValidAmount, setIsValidAmount] = useState(true);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [explorerLink, setExplorerLink] = useState("");
  const [transferStatus, setTransferStatus] = useState(false);
  const [ataStatus, setAtaStatus] = useState("NOT_INITIALIZED");
  const [isLoading, setIsLoading] = useState(false);

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

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
      } catch (TypeError) {
        console.error(TypeError);
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

  function validateAccount(receiverAddress: string) {
    try {
      const publicKey = new PublicKey(receiverAddress);
      const isValid = PublicKey.isOnCurve(publicKey);
      setIsValidAddress(isValid);
      return isValid;
    } catch (e) {
      setIsValidAddress(false);
      return false;
    }
  }

  async function handleTransfer() {
    if (!publicKey) {
      alert("Please Connect to a wallet");
      return;
    }
    if (!selectedAcc.mint) {
      alert("Please Select a token to transfer");
    }
    transferAmount > selectedAcc.balance && setIsValidAmount(false);
    if (transferAmount <= selectedAcc.balance) {
      try {
        if (validateAccount(receiverAddress)) {
          setIsLoading(true);
          if (selectedAcc.name === "Solana") {
            const receiver = new PublicKey(receiverAddress);
            const transaction = new Transaction();
            const transferSolInstructions = SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: receiver,
              lamports: LAMPORTS_PER_SOL * transferAmount,
            });
            transaction.add(transferSolInstructions);
            await sendTransaction(transaction, connection)
              .then((data) => {
                setExplorerLink(`https://explorer.solana.com/tx/${data}?cluster=devnet`);
                console.log(explorerLink);
                setTransferStatus(true);
              })
              .catch((err) => {
                if (err instanceof WalletSendTransactionError) {
                  alert("Transaction failed");
                }
              });
            setIsLoading(false);
          }

          const destWallet = new PublicKey(receiverAddress);
          const fromWallet = Keypair.generate();
          const mint = new PublicKey(selectedAcc.mint ?? "");
          const sourceAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, publicKey!!);

          try {
            const destinationAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, destWallet);
            const transaction = new Transaction();
            transaction.add(createTransferInstruction(sourceAccount.address, destinationAccount.address, publicKey!!, transferAmount * Math.pow(10, selectedAcc.decimalPlaces ?? 0)));
            await sendTransaction(transaction, connection).then((data) => {
              setExplorerLink(`https://explorer.solana.com/tx/${data}?cluster=devnet`);
              console.log(explorerLink);
              setTransferStatus(true);
            });
          } catch (err) {
            if (err instanceof TokenAccountNotFoundError) {
              console.log("from TokenAccountNotFoundError");
              setAtaStatus("INITIALIZED");
            }
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (err instanceof WalletSendTransactionError) {
          console.log("Transaction failed");
        }
      }
    }
  }

  function handleClose() {
    setTimeout(() => {
      setAtaStatus("NOT_INITIALIZED");
    }, 200);
    setIsLoading(false);
  }

  async function handleCreateAssociatedTokenAcc() {
    setTimeout(() => {
      setAtaStatus("PENDING");
    }, 200);
    setIsLoading(true);
    const destPublicKey = new PublicKey(receiverAddress);
    const mintPublicKey = new PublicKey(selectedAcc.mint ?? "");

    const associatedTokenAddress = await getAssociatedTokenAddress(mintPublicKey, destPublicKey, false);
    const transaction = new Transaction();
    transaction.add(createAssociatedTokenAccountInstruction(publicKey!!, associatedTokenAddress, destPublicKey, mintPublicKey));
    await sendTransaction(transaction, connection).then((data) => {
      setAtaStatus("SUCCESS");
      setExplorerLink(`https://explorer.solana.com/tx/${data}?cluster=devnet`);
    });
    setIsLoading(false);
  }

  return (
    <div className="h-screen w-full absolute pt-40 bg-background flex flex-col items-center">
      <p className="text-highlight text-2xl">Transfer tokens fast and secure.</p>
      <form className="flex flex-col mt-12">
        <div className="grid mb-3">
          <label htmlFor="tokenSelect" className="text-teal-50 mb-2">
            Select Token:
          </label>
          <select
            name="tokenSelect"
            className="w-80 h-10 pl-[0.3rem] rounded outline-background"
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
        <div className="grid mb-3">
          <label htmlFor="amountSelect" className="text-teal-50 mb-2 flex">
            Enter Amount: {!isValidAmount && <p className="ml-20 text-red-600">Invalid amount</p>}
          </label>
          <input
            type="number"
            name="amountSelect"
            className={`w-80 h-10 pl-[0.6rem] rounded outline-background ${!isValidAmount && "border-2 border-red-600"}`}
            value={transferAmount}
            disabled={isLoading}
            onChange={(e) => {
              setIsValidAmount(true);
              setTransferAmount(parseFloat(e.target.value));
            }}
          />
        </div>
        <div className="grid mb-3">
          <label htmlFor="receiverSelect" className="text-teal-50 mb-2 flex">
            Enter Receiver Address: {!isValidAddress && <p className="ml-4 text-red-600">Invalid address</p>}
          </label>
          <input
            type="text"
            name="receiverSelect"
            className={`w-80 h-10 pl-[0.6rem] rounded outline-background ${!isValidAddress && "border-2 border-red-600"}`}
            placeholder="Receiver Address"
            value={receiverAddress}
            disabled={isLoading}
            onChange={(e) => {
              setReceiverAddress(e.target.value);
            }}
          />
        </div>
        <button
          type="button"
          className="w-80 h-10 mt-10 rounded border transition-all hover:bg-highlighthover hover:border-highlightdarker border-transparent text-navtext bg-highlight"
          disabled={isLoading}
          onClick={(e) => {
            e.preventDefault();
            handleTransfer();
          }}
        >
          Transfer
        </button>
        {isLoading && <div className="mt-8 text-xl text-center text-teal-50">Waiting...</div>}
        {ataStatus === "INITIALIZED" && <TokenAccCreateModal handleCreateAssociatedTokenAcc={handleCreateAssociatedTokenAcc} receiverAddress={receiverAddress} handleClose={handleClose} />}
        {ataStatus === "SUCCESS" && (
          <TokenTransferModal
            explorerLink={explorerLink}
            receiverAddress={receiverAddress}
            handleTransfer={() => {
              setTimeout(() => {
                setAtaStatus("COMPLETED");
              }, 200);
              handleTransfer();
            }}
            handleClose={handleClose}
          />
        )}
        {transferStatus && (
          <TransferSuccess
            explorerLink={explorerLink}
            receiverAddress={receiverAddress}
            handleClose={() => {
              setTimeout(() => {
                setTransferStatus(false);
              }, 200);
            }}
            amount={transferAmount}
            tokenSymbol={selectedAcc.symbol ?? ""}
          />
        )}
      </form>
    </div>
  );
}
