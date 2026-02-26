import { useState, useEffect } from "react";
import { 
  Pickaxe, 
  Copy, 
  AlertCircle,
  Cpu,
  CheckCircle,
  Link2,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
  const [minerStats, setMinerStats] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [auxpowStatus, setAuxpowStatus] = useState(null);

  const fetchStats = async () => {
    try {
      let base = BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "");
      if (typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http://")) {
        base = "https://" + base.slice("http://".length);
      }
      const [netRes, minRes, auxRes] = await Promise.all([
        fetch(`${base}/api/network/stats`),
        fetch(`${base}/api/miners/stats`),
        fetch(`${base}/api/auxpow/status`)
      ]);
      if (netRes.ok) setStats(await netRes.json());
      if (minRes.ok) setMinerStats(await minRes.json());
      if (auxRes.ok) setAuxpowStatus(await auxRes.json());
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  useEffect(() => {
    // Carica il wallet locale una sola volta al mount
    const saved = localStorage.getItem('bricscoin_web_wallet');
    if (saved) {
      const wallet = JSON.parse(saved);
      setWalletAddress(wallet.address || "");
    }

    // Avvia fetch asincroni senza aspettarli sincronicamente
    fetchStats();
  }, []);

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
              <h4 className="font-bold text-red-500 text-lg">⚠️ ASIC Hardware Required</h4>
              <p className="text-sm text-muted-foreground mt-2">
                BricsCoin uses <strong>SHA256 Proof-of-Work</strong> (same as Bitcoin). Mining is <strong>NOT possible</strong> with:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li><strong className="text-red-400">Smartphones</strong> - No mining apps will work</li>
                <li><strong className="text-red-400">CPU/GPU</strong> - Not profitable, difficulty too high</li>
                <li><strong className="text-red-400">Browser mining</strong> - Not supported</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                <strong className="text-green-500">✓ Supported:</strong> ASIC miners (Bitaxe, Antminer S19/S21, Whatsminer M50/M60, etc.)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400" data-testid="active-miners-count">{minerStats?.active_miners ?? "-"}</p>
            <p className="text-xs text-muted-foreground">Active Miners</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats?.current_difficulty?.toLocaleString() || "-"}</p>
            <p className="text-xs text-muted-foreground">Difficulty</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats?.current_reward || 50}</p>
            <p className="text-xs text-muted-foreground">Block Reward</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats?.total_blocks || 0}</p>
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
              {stats?.hashrate_from_shares > 0 
                ? formatHashrate(stats.hashrate_from_shares) 
                : (stats ? formatHashrate(stats.hashrate_estimate) : "-")}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats?.hashrate_from_shares > 0 ? "Network Hashrate (Real)" : "Network Hashrate (Est.)"}
            </p>
          </CardContent>
        </Card>
      </div>

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
                <code className="text-primary font-bold">stratum+tcp://stratum.bricscoin26.org:3333</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard("stratum+tcp://stratum.bricscoin26.org:3333")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-yellow-500/20">
              <span className="text-muted-foreground">Alternative (IP diretto):</span>
              <div className="flex items-center gap-2">
                <code className="text-yellow-400">stratum+tcp://5.161.254.163:3333</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard("stratum+tcp://5.161.254.163:3333")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-white/10">
              <span className="text-muted-foreground">Server:</span>
              <div className="flex items-center gap-2">
                <code className="text-white">stratum.bricscoin26.org</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard("stratum.bricscoin26.org")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-white/10">
              <span className="text-muted-foreground">Port:</span>
              <div className="flex items-center gap-2">
                <code className="text-white">3333</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard("3333")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-black/40 rounded-lg border border-white/10">
              <span className="text-muted-foreground">Username:</span>
              <div className="flex items-center gap-2">
                <code className="text-green-400 break-all">{walletAddress || "YOUR_BRICS_WALLET_ADDRESS"}</code>
                {walletAddress && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(walletAddress)}>
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
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-200">
                Create a wallet first in the <a href="/wallet" className="underline">Wallet</a> section to get your mining address.
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
              <li>Set Hostname: <code className="bg-white/10 px-1 rounded">stratum.bricscoin26.org</code> (or <code className="bg-white/10 px-1 rounded">5.161.254.163</code>)</li>
              <li>Set Port: <code className="bg-white/10 px-1 rounded">3333</code></li>
              <li>Set User: Your BRICS wallet address</li>
              <li>Set Password: <code className="bg-white/10 px-1 rounded">x</code></li>
              <li>Click <strong>Save & Restart</strong></li>
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
              <li>Set Pool: <code className="bg-white/10 px-1 rounded">stratum.bricscoin26.org</code> (or <code className="bg-white/10 px-1 rounded">5.161.254.163</code>)</li>
              <li>Set Port: <code className="bg-white/10 px-1 rounded">3333</code></li>
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
              <span>Use <strong>stratum.bricscoin26.org</strong> or the direct IP <strong>5.161.254.163</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>If the domain doesn&apos;t work, use the <strong>direct IP address</strong> as fallback</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Your wallet address must start with <strong>BRICS</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Current block reward: <strong>{stats?.current_reward || 50} BRICS</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Algorithm: <strong>SHA256</strong> (Bitcoin-compatible)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Merge Mining (AuxPoW) */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30" data-testid="merge-mining-section">
        <CardHeader className="border-b border-orange-500/20">
          <CardTitle className="font-heading flex items-center gap-2">
            <Link2 className="w-5 h-5 text-orange-400" />
            Merge Mining (AuxPoW)
            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs ml-2">ENABLED</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <p className="text-muted-foreground text-sm">
            Bitcoin miners can mine BricsCoin <strong className="text-orange-400">simultaneously at zero extra cost</strong>. 
            BricsCoin's block hash is embedded in the Bitcoin coinbase transaction, allowing both chains to share the same Proof of Work.
          </p>

          {/* AuxPoW Stats */}
          {auxpowStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-black/40 rounded-lg border border-orange-500/10 text-center">
                <p className="text-xl font-bold text-orange-400" data-testid="auxpow-blocks-count">{auxpowStatus.statistics?.auxpow_blocks || 0}</p>
                <p className="text-xs text-muted-foreground">AuxPoW Blocks</p>
              </div>
              <div className="p-3 bg-black/40 rounded-lg border border-blue-500/10 text-center">
                <p className="text-xl font-bold text-blue-400">{auxpowStatus.statistics?.native_blocks || 0}</p>
                <p className="text-xs text-muted-foreground">Native Blocks</p>
              </div>
              <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-center">
                <p className="text-xl font-bold text-primary">{auxpowStatus.statistics?.auxpow_percentage || 0}%</p>
                <p className="text-xs text-muted-foreground">Merge Mined</p>
              </div>
              <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-center">
                <p className="text-xl font-bold text-primary">{auxpowStatus.current_difficulty?.toLocaleString() || "-"}</p>
                <p className="text-xs text-muted-foreground">Difficulty</p>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-orange-400">How to Merge Mine</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                <span className="text-orange-400 font-bold shrink-0">1.</span>
                <span>Request work: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/auxpow/create-work?miner_address=YOUR_ADDRESS</code></span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                <span className="text-orange-400 font-bold shrink-0">2.</span>
                <span>Embed the <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">coinbase_commitment</code> in your Bitcoin coinbase scriptSig</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                <span className="text-orange-400 font-bold shrink-0">3.</span>
                <span>Mine Bitcoin normally. If the block hash meets BricsCoin difficulty, submit the proof</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                <span className="text-orange-400 font-bold shrink-0">4.</span>
                <span>Submit proof: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">POST /api/auxpow/submit</code> with parent header + coinbase + merkle branch</span>
              </div>
            </div>
          </div>

          {/* Key benefits */}
          <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-lg">
            <h4 className="text-sm font-bold text-orange-400 mb-2">Key Benefits</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> Zero extra cost for Bitcoin miners</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> Massive hashrate increase from Bitcoin network</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> 51% attack becomes virtually impossible</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> Full independence — BricsCoin keeps its own blockchain and rules</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> Reversible — native PoW blocks always accepted</li>
            </ul>
          </div>

          {/* API Documentation link */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="w-4 h-4 text-orange-400" />
            <span>API Status: <code className="bg-white/10 px-1.5 py-0.5 rounded">/api/auxpow/status</code></span>
            <span className="text-green-400 font-bold">ONLINE</span>
          </div>
        </CardContent>
      </Card>

      {/* Supported Miners */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading">Supported ASIC Miners</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Bitaxe", "NerdMiner", "Antminer S9/S19", "Whatsminer", "AvalonMiner", "Canaan", "Innosilicon", "Ebang"].map((miner) => (
              <div key={miner} className="p-3 bg-white/5 rounded-lg text-center text-sm">
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
