import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  return (
    <div className="h-24 flex flex-row-reverse bg-navbar">
      <h1 className="w-full pt-8 pb-8 absolute cursor-default text-center text-2xl font-roboto font-black text-navtext">TransferIT</h1>
      <div className="mr-24 place-self-center z-10">
        <WalletMultiButton />
      </div>
    </div>
  );
}
