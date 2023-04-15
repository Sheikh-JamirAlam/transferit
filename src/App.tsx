import Navbar from "./components/Navbar";
import AccountInfo from "./components/AccountInfo";
import WalletContextProvider from "./contexts/WalletContextProvider";

export default function App() {
  return (
    <main>
      <WalletContextProvider cluster="devnet">
        <Navbar />
        <AccountInfo />
      </WalletContextProvider>
    </main>
  )
}
