import { useState, useEffect } from "react";
import {
  Pickaxe,
  Copy,
  AlertCircle,
  Cpu,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Risolve la base URL tenendo conto di HTTPS
const getBaseUrl = () => {
  let base =
    BACKEND_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    base.startsWith("http://")
  ) {
    base = "https://" + base.slice("http://".length);
  }
  return base;
};

// Formatta l’hashrate in H/s, kH/s, MH/s, GH/s, TH/s
const formatHashrate = (value) => {
  if (!value || typeof value !== "number") return "-";
  const abs = Math.abs(value);
  if (abs >= 1e12) return (value / 1e12).toFixed(2) + " TH/s";
  if (abs >= 1e9) return (value / 1e9).toFixed(2) + " GH/s";
  if (abs >= 1e6) return (value / 1e6).toFixed(2) + " MH/s";
  if (abs >= 1e3) return (value / 1e3).toFixed(2) + " kH/s";
  return value.toFixed(0) + " H/s";
};

export default function Mining() {
  const [stats, setStats] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [minersCount, setMinersCount] = useState(0);

  // Carica wallet + avvia fetch di stats e miners
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_web_wallet");
    if (saved) {
      const wallet = JSON.parse(saved);
      setWalletAddress(wallet.address || "");
    }

    fetchStats();
    fetchMiners();

    const minerInterval = setInterval(fetchMiners, 10000);
    return () => clearInterval(minerInterval);
  }, []);

  async function fetchStats() {
    try {
      const base = getBaseUrl();
      const response = await fetch(`${base}/api/network/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading network stats:", error);
    }
  }

  async function fetchMiners() {
    try {
      const base = getBaseUrl();
      const response = await fetch(`${base}/api/miners/stats`);
      if (response.ok) {
        const data = await response.json();
        // L’endpoint sul tuo server restituisce {"active_miners": N}
        const count =
          typeof data.active_miners === "number" ? data.active_miners : 0;
        setMinersCount(count);
      }
    } catch (error) {
      console.error("Error fetching miners:", error);
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6" data-testid="mining-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Hardware Mining</h1>
        <p className="text-muted-foreground">
          Mine BricsCoin with SHA256 ASIC hardware using Stratum protocol
        </p>
      </div>

      {/* Important Notice */}
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-500 text-lg">
                ⚠️ ASIC Hardware Required
              </h4>
              <p className="text-sm text-muted-foreground mt-2">
                BricsCoin uses <strong>SHA256 Proof-of-Work</strong> (same as
                Bitcoin). Mining is <strong>NOT possible</strong> with:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>
                  <strong className="text-red-400">Smartphones</strong> - No
                  mining apps will work
                </li>
                <li>
                  <strong className="text-red-400">CPU/GPU</strong> - Not
                  profitable, difficulty too high
                </li>
                <li>
                  <strong className="text-red-400">Browser mining</strong> - Not
                  supported
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                <strong className="text-green-500">✓ Supported:</strong> ASIC
                miners (Bitaxe, Antminer S19/S21, Whatsminer M50/M60, etc.)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {stats?.current_difficulty?.toLocaleString() || "-"}
            </p>
            <p className="text-xs text-muted-foreground">Difficulty</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {stats?.current_reward || 50}
            </p>
            <p className="text-xs text-muted-foreground">Block Reward</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {stats?.total_blocks || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total Blocks</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">SHA256</p>
            <p className="text-xs text-muted-foreground">Algorithm</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {stats ? formatHashrate(stats.hashrate_estimate) : "-"}
            </p>
            <p className="text-xs text-muted-foreground">Network Hashrate</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Miners */}
      <Card className="bg-card border-green-500/20">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="font-heading flex items-center gap-2">
            <Cpu className="w-5 h-5 text-green-500" />
            Active Miners
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-4">
            <p className="text-2xl font-bold text-green-500 mb-2">
              {minersCount} miner{minersCount === 1 ? "" : "s"} online
            </p>
            <p className="text-sm">
              Connect your ASIC miner to start mining BricsCoin
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-xl font-bold text-green-400">
                  {stats?.total_blocks || 0}
                </p>
                <p className="text-xs text-muted-foreground">Blocks Mined</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-xl font-bold text-green-400">
                  {stats?.current_difficulty?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Difficulty</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-xl font-bold text-green-400">
                  {minersCount > 0 ? "Active" : "Waiting"}
                </p>
                <p className="text-xs text-muted-foreground">Network Status</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-xl font-bold text-green-400">
                  {stats?.current_reward || 50} BRICS
                </p>
                <p className="text-xs text-muted-foreground">Block Reward</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stratum Configuration */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
        <CardHeader className="border-b border-primary/20">
          <CardTitle className="font-heading flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            Stratum Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-6">
            Connect your ASIC miner (Bitaxe, NerdMiner, Antminer, Whatsminer) using these settings:
          </p>
          
          <div className="space-y-4 font-mono text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-primary/20">
              <span className="text-muted-foreground">Pool URL:</span>
              <div className="flex items-center gap-2">
                <code className="text-primary font-bold">
                  stratum+tcp://stratum.bricscoin26.org:3333
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    copyToClipboard("stratum+tcp://stratum.bricscoin26.org:3333")
                  }
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-yellow-500/20">
              <span className="text-muted-foreground">Alternative (IP diretto):</span>
              <div className="flex items-center gap-2">
                <code className="text-yellow-400">
                  stratum+tcp://5.161.254.163:3333
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    copyToClipboard("stratum+tcp://5.161.254.163:3333")
                  }
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-white/10">
              <span className="text-muted-foreground">Server:</span>
              <div className="flex items-center gap-2">
                <code className="text-white">stratum.bricscoin26.org</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard("stratum.bricscoin26.org")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-white/10">
              <span className="text-muted-foreground">Port:</span>
              <div className="flex items-center gap-2">
                <code className="text-white">3333</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard("3333")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-white/10">
              <span className="text-muted-foreground">Username:</span>
              <div className="flex items-center gap-2">
                <code className="text-green-400 break-all">
                  {walletAddress || "YOUR_BRICS_WALLET_ADDRESS"}
                </code>
                {walletAddress && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(walletAddress)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-white/10">
              <span className="text-muted-foreground">Password:</span>
              <code className="text-white">x</code>
            </div>
          </div>

          {!walletAddress && (
            <div className="mt-4 p-3 bg-yellow-500/10 border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-200">
                Create a wallet first in the{" "}
                <a href="/wallet" className="underline">
                  Wallet
                </a>{" "}
                section to get your mining address.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guides */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bitaxe */}
        <Card className="bg-card border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Pickaxe className="w-5 h-5 text-orange-500" />
              Bitaxe Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
              <li>Open your Bitaxe web dashboard</li>
              <li>Navigate to <strong>Settings → Pool</strong></li>
              <li>
                Set Hostname:{" "}
                <code className="bg-white/10 px-1 rounded">
                  stratum.bricscoin26.org
                </code>{" "}
                (or{" "}
                <code className="bg-white/10 px-1 rounded">
                  5.161.254.163
                </code>
                )
              </li>
              <li>
                Set Port:{" "}
                <code className="bg-white/10 px-1 rounded">3333</code>
              </li>
              <li>Set User: Your BRICS wallet address</li>
              <li>
                Set Password:{" "}
                <code className="bg-white/10 px-1 rounded">x</code>
              </li>
              <li>
                Click <strong>Save & Restart</strong>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* NerdMiner */}
        <Card className="bg-card border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-500" />
              NerdMiner Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
              <li>Access NerdMiner via web interface</li>
              <li>Go to <strong>Settings → Mining Pool</strong></li>
              <li>
                Set Pool:{" "}
                <code className="bg-white/10 px-1 rounded">
                  stratum.bricscoin26.org
                </code>{" "}
                (or{" "}
                <code className="bg-white/10 px-1 rounded">
                  5.161.254.163
                </code>
                )
              </li>
              <li>
                Set Port:{" "}
                <code className="bg-white/10 px-1 rounded">3333</code>
              </li>
              <li>Set Address: Your BRICS wallet address</li>
              <li>Save and restart the device</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Important Notes */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="text-sm text-muted-foreground space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Use <strong>stratum.bricscoin26.org</strong> or the direct IP{" "}
                <strong>5.161.254.163</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                If the domain doesn&apos;t work, use the{" "}
                <strong>direct IP address</strong> as fallback
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Your wallet address must start with <strong>BRICS</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Current block reward:{" "}
                <strong>{stats?.current_reward || 50} BRICS</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Algorithm: <strong>SHA256</strong> (Bitcoin-compatible)
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Supported Miners */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading">Supported ASIC Miners</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Bitaxe",
              "NerdMiner",
              "Antminer S9/S19",
              "Whatsminer",
              "AvalonMiner",
              "Canaan",
              "Innosilicon",
              "Ebang",
            ].map((miner) => (
              <div
                key={miner}
                className="p-3 bg-white/5 rounded-lg text-center text-sm"
              >
                {miner}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Any SHA256 ASIC miner with Stratum support will work with BricsCoin
          </p>
        </CardContent>
      </Card>
    </div>
  );
}