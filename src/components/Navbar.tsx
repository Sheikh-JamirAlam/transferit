import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  return (
    <div className="grid grid-cols-6 bg-navbar">
      <h1 className="pt-8 pb-8 col-span-5 text-center text-2xl font-roboto font-black text-navtext">TransferIT</h1>
      <div className="grid content-center w-48">
        <WalletMultiButton />
      </div>
    </div>
  );
}
