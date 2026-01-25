import { useState, useEffect, useRef } from "react";
import { 
  Pickaxe, Play, Square, Zap, Trophy, Hash, RefreshCw, Copy, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getMiningTemplate, submitMinedBlock, getNetworkStats } from "../lib/api";

export default function Mining() {
  const [minerAddress, setMinerAddress] = useState("");
  const [isMining, setIsMining] = useState(false);
  const [hashrate, setHashrate] = useState(0);
  const [totalHashes, setTotalHashes] = useState(0);
  const [currentNonce, setCurrentNonce] = useState(0);
  const [template, setTemplate] = useState(null);
  const [stats, setStats] = useState(null);
  const [blocksFound, setBlocksFound] = useState(0);
  const [lastHash, setLastHash] = useState("");
  const [workerStatus, setWorkerStatus] = useState("idle");
  
  const workerRef = useRef(null);
  const templateRef = useRef(null);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker('/miningWorker.js');
    
    workerRef.current.onmessage = async (e) => {
      const { type, nonce, hash, hashCount, hashrate: workerHashrate } = e.data;
      
      switch (type) {
        case 'STARTED':
          setWorkerStatus("mining");
          toast.success("Mining started!");
          break;
          
        case 'PROGRESS':
          setCurrentNonce(nonce);
          setLastHash(hash);
          setTotalHashes(hashCount);
          setHashrate(workerHashrate);
          break;
          
        case 'BLOCK_FOUND':
          console.log("Block found!", { nonce, hash });
          setWorkerStatus("submitting");
          
          try {
            const result = await submitMinedBlock({
              block_data: templateRef.current?.block_data,
              nonce: nonce,
              hash: hash,
              miner_address: minerAddress
            });
            
            toast.success(`Block #${result.data.block.index} mined! +${result.data.reward} BRICS`, {
              duration: 10000
            });
            
            setBlocksFound(prev => prev + 1);
            
            const newTemplate = await fetchTemplate();
            if (newTemplate && workerRef.current) {
              workerRef.current.postMessage({
                type: 'NEW_JOB',
                data: { blockData: newTemplate.block_data, target: newTemplate.target }
              });
            }
          } catch (error) {
            if (error.response?.status === 409) {
              toast.info("Block already mined, getting new template...");
              const newTemplate = await fetchTemplate();
              if (newTemplate && workerRef.current) {
                workerRef.current.postMessage({
                  type: 'NEW_JOB',
                  data: { blockData: newTemplate.block_data, target: newTemplate.target }
                });
              }
            } else {
              toast.error("Failed to submit block");
            }
          }
          setWorkerStatus("mining");
          break;
          
        case 'STOPPED':
          setWorkerStatus("idle");
          break;
          
        case 'STATUS':
          setHashrate(e.data.hashrate);
          setTotalHashes(e.data.hashCount);
          break;
      }
    };
    
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [minerAddress]);

  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_miner_address");
    if (saved) {
      setMinerAddress(saved);
    } else {
      const wallets = localStorage.getItem("bricscoin_wallets");
      if (wallets) {
        const parsed = JSON.parse(wallets);
        if (parsed.length > 0) setMinerAddress(parsed[0].address);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await getNetworkStats();
        setStats(res.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isMining) return;
    const interval = setInterval(() => {
      if (workerRef.current) workerRef.current.postMessage({ type: 'GET_STATUS' });
    }, 1000);
    return () => clearInterval(interval);
  }, [isMining]);

  const fetchTemplate = async () => {
    try {
      const res = await getMiningTemplate();
      setTemplate(res.data);
      templateRef.current = res.data;
      return res.data;
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("Failed to fetch mining template");
      return null;
    }
  };

  const startMining = async () => {
    if (!minerAddress) {
      toast.error("Miner address required");
      return;
    }
    localStorage.setItem("bricscoin_miner_address", minerAddress);
    
    const currentTemplate = await fetchTemplate();
    if (!currentTemplate) return;
    
    setIsMining(true);
    setTotalHashes(0);
    setHashrate(0);
    
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'START',
        data: { blockData: currentTemplate.block_data, target: currentTemplate.target }
      });
    }
  };

  const stopMining = () => {
    if (workerRef.current) workerRef.current.postMessage({ type: 'STOP' });
    setIsMining(false);
    toast.info("Mining stopped");
  };

  const formatHashrate = (rate) => {
    if (rate >= 1000000) return `${(rate / 1000000).toFixed(2)} MH/s`;
    if (rate >= 1000) return `${(rate / 1000).toFixed(2)} KH/s`;
    return `${rate} H/s`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  return (
    <div className="space-y-6" data-testid="mining-page">
      <div>
        <h1 className="text-3xl font-heading font-bold">Mining</h1>
        <p className="text-muted-foreground">Mine BRICS using your browser</p>
      </div>

      {/* Mining Control */}
      <Card className={`bg-card border-white/10 ${isMining ? "mining-active ring-2 ring-primary/50" : ""}`}>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label>Miner Address</Label>
              <Input
                placeholder="BRICS..."
                value={minerAddress}
                onChange={(e) => setMinerAddress(e.target.value)}
                disabled={isMining}
                className="font-mono bg-background border-white/20"
                data-testid="miner-address-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mining rewards will be sent to this address
              </p>
            </div>

            <div className="flex gap-4">
              {!isMining ? (
                <Button onClick={startMining} className="gold-button rounded-sm flex-1" disabled={!minerAddress} data-testid="start-mining-btn">
                  <Play className="w-5 h-5 mr-2" />
                  Start Mining
                </Button>
              ) : (
                <Button onClick={stopMining} variant="destructive" className="flex-1 rounded-sm" data-testid="stop-mining-btn">
                  <Square className="w-5 h-5 mr-2" />
                  Stop Mining
                </Button>
              )}
              <Button variant="outline" className="border-white/20" onClick={fetchTemplate} disabled={isMining}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            
            {isMining && (
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${workerStatus === 'mining' ? 'bg-green-500 animate-pulse' : workerStatus === 'submitting' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                <span className="text-muted-foreground">
                  {workerStatus === 'mining' ? 'Mining in background...' : workerStatus === 'submitting' ? 'Submitting block...' : 'Idle'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center">
                  <Zap className={`w-5 h-5 text-primary ${isMining ? "animate-pulse" : ""}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hashrate</p>
                  <p className="text-xl font-heading font-bold">{formatHashrate(hashrate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-secondary/20 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hashes</p>
                  <p className="text-xl font-heading font-bold">{totalHashes.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-green-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blocks Found</p>
                  <p className="text-xl font-heading font-bold">{blocksFound}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-orange-500/20 flex items-center justify-center">
                  <Pickaxe className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Block Reward</p>
                  <p className="text-xl font-heading font-bold">{stats?.current_reward || 50} BRICS</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Mining Progress */}
      {isMining && template && (
        <Card className="bg-card border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading">Mining Block #{template.index}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Current Nonce</p>
                <p className="font-mono">{currentNonce.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target (must start with)</p>
                <p className="font-mono text-primary">{template.target}</p>
              </div>
            </div>
            {lastHash && (
              <div>
                <p className="text-muted-foreground text-sm">Last Hash</p>
                <p className="font-mono text-xs break-all">{lastHash}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stratum Section */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading flex items-center gap-2">
            <Pickaxe className="w-5 h-5" />
            Hardware Mining (ASIC / NerdMiner / Bitaxe)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-4">
            Connect your hardware miner using Stratum protocol. Supported devices: NerdMiner, Bitaxe, Antminer, and any SHA256 ASIC miner.
          </p>
          
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5 rounded-lg mb-6">
            <h4 className="font-bold text-primary mb-4">⚡ Stratum Configuration</h4>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-black/30 rounded">
                <span className="text-muted-foreground">Pool URL:</span>
                <div className="flex items-center gap-2">
                  <code className="text-primary">stratum+tcp://5.161.254.163:3333</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard("stratum+tcp://5.161.254.163:3333")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-black/30 rounded">
                <span className="text-muted-foreground">Port:</span>
                <code className="text-white">3333</code>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-black/30 rounded">
                <span className="text-muted-foreground">Username/Worker:</span>
                <code className="text-green-400">{minerAddress || "YOUR_BRICS_WALLET_ADDRESS"}</code>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-black/30 rounded">
                <span className="text-muted-foreground">Password:</span>
                <code className="text-white">x</code>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-card border border-white/10 rounded-lg">
              <h5 className="font-bold mb-2">🔧 NerdMiner Setup</h5>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Access NerdMiner web interface</li>
                <li>Go to Settings → Mining</li>
                <li>Set Pool: <code className="text-xs bg-white/10 px-1 rounded">5.161.254.163</code></li>
                <li>Set Port: <code className="text-xs bg-white/10 px-1 rounded">3333</code></li>
                <li>Set Address: Your BRICS wallet</li>
                <li>Save and restart</li>
              </ol>
            </div>
            <div className="p-4 bg-card border border-white/10 rounded-lg">
              <h5 className="font-bold mb-2">⚡ Bitaxe Setup</h5>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open Bitaxe web dashboard</li>
                <li>Navigate to Pool Settings</li>
                <li>URL: <code className="text-xs bg-white/10 px-1 rounded">5.161.254.163:3333</code></li>
                <li>User: Your BRICS wallet address</li>
                <li>Pass: <code className="text-xs bg-white/10 px-1 rounded">x</code></li>
                <li>Apply and reboot</li>
              </ol>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-yellow-200 mb-1">Important Notes:</p>
              <ul className="text-xs text-yellow-200/80 space-y-1 list-disc list-inside">
                <li>Use the direct IP address (5.161.254.163), not the domain name</li>
                <li>Cloudflare proxy doesn't support port 3333</li>
                <li>Make sure your BRICS wallet address starts with "BRICS"</li>
                <li>Mining reward: {stats?.current_reward || 50} BRICS per block</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
