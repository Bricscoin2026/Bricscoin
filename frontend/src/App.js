import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";import Blockchain from "./pages/Blockchain";
import BlockDetail from "./pages/BlockDetail";
import TransactionDetail from "./pages/TransactionDetail";
import WalletHub from "./pages/WalletHub";
import Downloads from "./pages/Downloads";
import About from "./pages/About";
import BricsChat from "./pages/BricsChat";
import TimeCapsule from "./pages/TimeCapsule";
import AiOracle from "./pages/AiOracle";
import BricsNFT from "./pages/BricsNFT";
import P2Pool from "./pages/P2Pool";
import Mining from "./pages/Mining";
import MergeMiningGuide from "./pages/MergeMiningGuide";
import JabosGuide from "./pages/JabosGuide";
import ExchangeListing from "./pages/ExchangeListing";
import MobileWallet from "./pages/MobileWallet";
import Network from "./pages/Network";
import Whitepaper from "./pages/Whitepaper";
import "./App.css";

function App() {
  return (
    <div className="App noise-overlay min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/mobile-wallet" element={<MobileWallet />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="blockchain" element={<Blockchain />} />
            <Route path="block/:index" element={<BlockDetail />} />
            <Route path="tx/:txId" element={<TransactionDetail />} />
            <Route path="wallet" element={<WalletHub />} />
            <Route path="chat" element={<BricsChat />} />
            <Route path="timecapsule" element={<TimeCapsule />} />
            <Route path="oracle" element={<AiOracle />} />
            <Route path="nft" element={<BricsNFT />} />
            <Route path="p2pool" element={<P2Pool />} />
            <Route path="mining" element={<Mining />} />
            <Route path="merge-mining" element={<MergeMiningGuide />} />
            <Route path="jabos" element={<JabosGuide />} />
            <Route path="listing" element={<ExchangeListing />} />
            <Route path="network" element={<Network />} />
            <Route path="whitepaper" element={<Whitepaper />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
