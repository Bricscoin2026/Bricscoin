import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Pickaxe, 
  Play, 
  Square, 
  Cpu, 
  Zap,
  Clock,
  Trophy,
  Hash,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getMiningTemplate, submitMinedBlock, getNetworkStats } from "../lib/api";

// SHA256 implementation for browser
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  
  const miningRef = useRef(false);
  const startTimeRef = useRef(null);
  const hashCountRef = useRef(0);

  // Load miner address from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_miner_address");
    if (saved) {
      setMinerAddress(saved);
    } else {
      // Try to load from wallets
      const wallets = localStorage.getItem("bricscoin_wallets");
      if (wallets) {
        const parsed = JSON.parse(wallets);
        if (parsed.length > 0) {
          setMinerAddress(parsed[0].address);
        }
      }
    }
  }, []);

  // Fetch network stats
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

  // Update hashrate display
  useEffect(() => {
    if (!isMining) return;
    
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const rate = hashCountRef.current / elapsed;
        setHashrate(Math.round(rate));
        setTotalHashes(hashCountRef.current);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isMining]);

  const fetchTemplate = async () => {
    try {
      const res = await getMiningTemplate();
      setTemplate(res.data);
      return res.data;
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("Failed to fetch mining template");
      return null;
    }
  };

  const mine = useCallback(async () => {
    if (!miningRef.current) return;

    const currentTemplate = await fetchTemplate();
    if (!currentTemplate || !miningRef.current) return;

    const { block_data, difficulty, target } = currentTemplate;
    let nonce = 0;
    const batchSize = 1000;

    while (miningRef.current) {
      for (let i = 0; i < batchSize; i++) {
        const testData = block_data + nonce;
        const hash = await sha256(testData);
        
        hashCountRef.current++;
        setCurrentNonce(nonce);
        
        if (nonce % 100 === 0) {
          setLastHash(hash);
        }

        if (hash.startsWith(target)) {
          // Found a valid block!
          console.log("Block found!", { nonce, hash });
          
          try {
            const result = await submitMinedBlock({
              block_data: block_data,
              nonce: nonce,
              hash: hash,
              miner_address: minerAddress
            });
            
            toast.success(`Block #${result.data.block.index} mined! Reward: ${result.data.reward} BRICS`, {
              duration: 10000
            });
            
            setBlocksFound(prev => prev + 1);
            
            // Get new template and continue
            if (miningRef.current) {
              setTimeout(() => mine(), 1000);
            }
            return;
          } catch (error) {
            if (error.response?.status === 409) {
              // Block already mined, get new template
              toast.info("Block already mined by someone else, getting new template...");
              if (miningRef.current) {
                setTimeout(() => mine(), 500);
              }
              return;
            }
            console.error("Error submitting block:", error);
            toast.error("Failed to submit block");
          }
        }
        
        nonce++;
      }

      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }, [minerAddress]);

  const startMining = async () => {
    if (!minerAddress) {
      toast.error("Please enter a miner address");
      return;
    }

    localStorage.setItem("bricscoin_miner_address", minerAddress);
    
    miningRef.current = true;
    setIsMining(true);
    startTimeRef.current = Date.now();
    hashCountRef.current = 0;
    
    toast.success("Mining started!");
    mine();
  };

  const stopMining = () => {
    miningRef.current = false;
    setIsMining(false);
    toast.info("Mining stopped");
  };

  const formatHashrate = (rate) => {
    if (rate >= 1000000) return `${(rate / 1000000).toFixed(2)} MH/s`;
    if (rate >= 1000) return `${(rate / 1000).toFixed(2)} KH/s`;
    return `${rate} H/s`;
  };

  return (
    <div className="space-y-6" data-testid="mining-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Mining</h1>
        <p className="text-muted-foreground">Mine BRICS using your browser</p>
      </div>

      {/* Mining Control */}
      <Card className={`bg-card border-white/10 ${isMining ? "mining-active" : ""}`} data-testid="mining-control-card">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Miner Address */}
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

            {/* Control Button */}
            <div className="flex gap-4">
              {!isMining ? (
                <Button
                  onClick={startMining}
                  className="gold-button rounded-sm flex-1"
                  disabled={!minerAddress}
                  data-testid="start-mining-btn"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Mining
                </Button>
              ) : (
                <Button
                  onClick={stopMining}
                  variant="destructive"
                  className="flex-1 rounded-sm"
                  data-testid="stop-mining-btn"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Mining
                </Button>
              )}
              <Button
                variant="outline"
                className="border-white/20"
                onClick={fetchTemplate}
                disabled={isMining}
                data-testid="refresh-template-btn"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mining Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-white/10" data-testid="hashrate-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center">
                  <Zap className={`w-5 h-5 text-primary ${isMining ? "animate-pulse" : ""}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hashrate</p>
                  <p className="text-xl font-heading font-bold">
                    {formatHashrate(hashrate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-white/10" data-testid="hashes-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-secondary/20 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hashes</p>
                  <p className="text-xl font-heading font-bold">
                    {totalHashes.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-white/10" data-testid="blocks-found-card">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card border-white/10" data-testid="difficulty-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-orange-500/20 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                  <p className="text-xl font-heading font-bold">
                    {template?.difficulty || stats?.current_difficulty || 4}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Current Mining Info */}
      {isMining && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-card border-white/10" data-testid="mining-progress-card">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Pickaxe className="w-5 h-5 text-primary animate-bounce" />
                Mining in Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Current Nonce</span>
                  <span className="font-mono">{currentNonce.toLocaleString()}</span>
                </div>
                <Progress value={(currentNonce % 10000) / 100} className="h-2" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Latest Hash</p>
                <div className="bg-background p-3 rounded-sm border border-white/10">
                  <p className="font-mono text-xs break-all text-muted-foreground">
                    {lastHash || "Computing..."}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Target (must start with)</p>
                <div className="bg-background p-3 rounded-sm border border-white/10">
                  <p className="font-mono text-sm text-primary">
                    {"0".repeat(template?.difficulty || 4)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Mining Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card border-white/10 h-full" data-testid="how-it-works-card">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading">How Mining Works</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Your browser receives a block template from the network</li>
                <li>It tries different nonce values, hashing with SHA256</li>
                <li>When a hash starts with enough zeros (difficulty), you win!</li>
                <li>The block is submitted and you receive the mining reward</li>
                <li>Difficulty adjusts every 2016 blocks to maintain 10min blocks</li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-card border-white/10 h-full" data-testid="rewards-card">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading">Mining Rewards</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Reward</span>
                  <span className="font-mono text-primary text-lg">
                    {stats?.current_reward || 50} BRICS
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Next Halving</span>
                  <span className="font-mono">
                    Block #{stats?.next_halving_block?.toLocaleString() || "210,000"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Halving Interval</span>
                  <span className="font-mono">210,000 blocks</span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-muted-foreground">
                    Block rewards halve every 210,000 blocks until all 21,000,000 BRICS are mined.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Warning */}
      <Card className="bg-yellow-500/10 border-yellow-500/30" data-testid="mining-warning-card">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-500">
            <strong>Note:</strong> Browser mining is less efficient than dedicated mining software. 
            For better performance, consider using a native miner with the API endpoints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
