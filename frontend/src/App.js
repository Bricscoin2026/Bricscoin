import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Explorer from "./pages/Explorer";
import BlockDetail from "./pages/BlockDetail";
import Wallet from "./pages/Wallet";
import Mining from "./pages/Mining";
import Network from "./pages/Network";
import TransactionDetail from "./pages/TransactionDetail";
import Downloads from "./pages/Downloads";
import RunNode from "./pages/RunNode";
import About from "./pages/About";
// Pools page removed
import RichList from "./pages/RichList";
import PQCWallet from "./pages/PQCWallet";
import WalletMigration from "./pages/WalletMigration";
import BricsChat from "./pages/BricsChat";
import TimeCapsule from "./pages/TimeCapsule";
import AiOracle from "./pages/AiOracle";
import "./App.css";

function App() {
  return (
    <div className="App noise-overlay min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="explorer" element={<Explorer />} />
            <Route path="block/:index" element={<BlockDetail />} />
            <Route path="tx/:txId" element={<TransactionDetail />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="pqc-wallet" element={<PQCWallet />} />
            <Route path="migrate" element={<WalletMigration />} />
            <Route path="mining" element={<Mining />} />
            <Route path="network" element={<Network />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="node" element={<RunNode />} />
            <Route path="richlist" element={<RichList />} />
            <Route path="about" element={<About />} />
            <Route path="chat" element={<BricsChat />} />
            <Route path="timecapsule" element={<TimeCapsule />} />
            <Route path="oracle" element={<AiOracle />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
