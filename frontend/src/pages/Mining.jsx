import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Pickaxe, 
  Play, 
  Square, 
  Cpu, 
  Zap,
  Trophy,
  Hash,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getMiningTemplate, submitMinedBlock, getNetworkStats } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

export default function Mining() {
  const { t } = useLanguage();
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
          toast.success(t('startMining') + "!");
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
            
            // Get new template and continue mining
            const newTemplate = await fetchTemplate();
            if (newTemplate && workerRef.current) {
              workerRef.current.postMessage({
                type: 'NEW_JOB',
                data: {
                  blockData: newTemplate.block_data,
                  target: newTemplate.target
                }
              });
            }
          } catch (error) {
            if (error.response?.status === 409) {
              toast.info("Block already mined, getting new template...");
              const newTemplate = await fetchTemplate();
              if (newTemplate && workerRef.current) {
                workerRef.current.postMessage({
                  type: 'NEW_JOB',
                  data: {
                    blockData: newTemplate.block_data,
                    target: newTemplate.target
                  }
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
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [minerAddress, t]);

  // Load miner address from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_miner_address");
    if (saved) {
      setMinerAddress(saved);
    } else {
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

  // Periodically request status from worker
  useEffect(() => {
    if (!isMining) return;
    
    const interval = setInterval(() => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'GET_STATUS' });
      }
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
      toast.error(t('minerAddress') + " required");
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
        data: {
          blockData: currentTemplate.block_data,
          target: currentTemplate.target
        }
      });
    }
  };

  const stopMining = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
    setIsMining(false);
    toast.info(t('stopMining'));
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
        <h1 className="text-3xl font-heading font-bold">{t('miningTitle')}</h1>
        <p className="text-muted-foreground">{t('miningSubtitle')}</p>
      </div>

      {/* Mining Control */}
      <Card className={`bg-card border-white/10 ${isMining ? "mining-active ring-2 ring-primary/50" : ""}`} data-testid="mining-control-card">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Miner Address */}
            <div>
              <Label>{t('minerAddress')}</Label>
              <Input
                placeholder="BRICS..."
                value={minerAddress}
                onChange={(e) => setMinerAddress(e.target.value)}
                disabled={isMining}
                className="font-mono bg-background border-white/20"
                data-testid="miner-address-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('rewardsToAddress')}
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
                  {t('startMining')}
                </Button>
              ) : (
                <Button
                  onClick={stopMining}
                  variant="destructive"
                  className="flex-1 rounded-sm"
                  data-testid="stop-mining-btn"
                >
                  <Square className="w-5 h-5 mr-2" />
                  {t('stopMining')}
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
            
            {/* Worker Status */}
            {isMining && (
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  workerStatus === 'mining' ? 'bg-green-500 animate-pulse' : 
                  workerStatus === 'submitting' ? 'bg-yellow-500' : 'bg-gray-500'
                }`} />
                <span className="text-muted-foreground">
                  {workerStatus === 'mining' ? 'Mining in background...' : 
                   workerStatus === 'submitting' ? 'Submitting block...' : 'Idle'}
                </span>
              </div>
            )}
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
                  <p className="text-sm text-muted-foreground">{t('hashrate')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('totalHashes')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('blocksFound')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('difficulty')}</p>
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
                {t('miningInProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t('currentNonce')}</span>
                  <span className="font-mono">{currentNonce.toLocaleString()}</span>
                </div>
                <Progress value={(currentNonce % 10000) / 100} className="h-2" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('lastHash')}</p>
                <div className="bg-background p-3 rounded-sm border border-white/10">
                  <p className="font-mono text-xs break-all text-muted-foreground">
                    {lastHash || "Computing..."}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('target')}</p>
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
              <CardTitle className="font-heading">{t('howMiningWorks')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>{t('miningStep1')}</li>
                <li>{t('miningStep2')}</li>
                <li>{t('miningStep3')}</li>
                <li>{t('miningStep4')}</li>
                <li>{t('miningStep5')}</li>
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
              <CardTitle className="font-heading">{t('miningRewards')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('currentReward')}</span>
                  <span className="font-mono text-primary text-lg">
                    {stats?.current_reward || 50} BRICS
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('nextHalving')}</span>
                  <span className="font-mono">
                    Block #{stats?.next_halving_block?.toLocaleString() || "210,000"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('halvingInterval')}</span>
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
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-500">
            <strong>Note:</strong> {t('miningWarning')}
          </p>
        </CardContent>
      </Card>

      {/* Stratum / ASIC Mining Section */}
      <Card className="bg-card border-white/10" data-testid="stratum-card">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            {t('stratumTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('stratumSubtitle')}</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-black/30 rounded-sm p-4 border border-white/10">
            <h4 className="font-bold mb-3">{t('stratumConfig')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('stratumPool')}</p>
                <p className="font-mono text-primary">5.161.254.163</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('stratumPort')}</p>
                <p className="font-mono text-primary">3333</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('stratumUser')}</p>
                <p className="font-mono text-sm">YOUR_BRICS_ADDRESS.worker</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('stratumPass')}</p>
                <p className="font-mono">x</p>
              </div>
            </div>
          </div>
          
          <div className="bg-black/30 rounded-sm p-4 border border-white/10">
            <p className="text-xs text-muted-foreground mb-2">URL Stratum:</p>
            <code className="text-primary font-mono text-sm">stratum+tcp://5.161.254.163:3333</code>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-500">{t('stratumNote')}</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => {
                navigator.clipboard.writeText('stratum+tcp://5.161.254.163:3333');
                toast.success(t('copied'));
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              {t('copyConfig')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
