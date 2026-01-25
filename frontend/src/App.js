import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { LanguageProvider } from "./context/LanguageContext";
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
import "./App.css";

function App() {
  return (
    <LanguageProvider>
      <div className="App noise-overlay min-h-screen bg-background">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="explorer" element={<Explorer />} />
              <Route path="block/:index" element={<BlockDetail />} />
              <Route path="tx/:txId" element={<TransactionDetail />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="mining" element={<Mining />} />
              <Route path="network" element={<Network />} />
              <Route path="downloads" element={<Downloads />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </div>
    </LanguageProvider>
  );
}

export default App;
