import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  FileText, 
  Github, 
  User, 
  Target, 
  Shield, 
  Zap,
  CheckCircle,
  Clock,
  ExternalLink,
  Coins,
  ShieldCheck,
  Lock,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { getTokenomics } from "../lib/api";

export default function About() {
  const [tokenomics, setTokenomics] = useState(null);

  useEffect(() => {
    async function fetchTokenomics() {
      try {
        const res = await getTokenomics();
        setTokenomics(res.data);
      } catch (error) {
        console.error("Error fetching tokenomics:", error);
      }
    }
    fetchTokenomics();
  }, []);

  const roadmapItems = [
    { phase: "January 2026", status: "done", items: ["Mainnet launch", "Web wallet with instant transactions", "Block explorer", "Hardware mining (Stratum)", "Desktop wallet (Linux, Windows, Mac)", "Open source on GitHub", "Security audit completed"] },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-heading font-bold">
          About <span className="gold-text">BricsCoin</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A decentralized SHA256 Proof-of-Work cryptocurrency. Open source, transparent, and community-driven.
        </p>
      </div>

      {/* Security Audit */}
      <Card className="bg-gradient-to-r from-green-500/10 to-green-600/5 border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-500" />
            Security Audit
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">PASSED ✓</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            BricsCoin has undergone a comprehensive security audit covering input validation, 
            cryptographic security, and attack prevention. All 27 security tests passed.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h4 className="font-bold text-green-400">Input Validation</h4>
              </div>
              <p className="text-sm text-muted-foreground">8/8 tests passed</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Address format validation</li>
                <li>• Amount validation</li>
                <li>• Signature format check</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-green-500" />
                <h4 className="font-bold text-green-400">Cryptography</h4>
              </div>
              <p className="text-sm text-muted-foreground">2/2 tests passed</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• ECDSA secp256k1 signing</li>
                <li>• Client-side key security</li>
                <li>• Address verification</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-green-500" />
                <h4 className="font-bold text-green-400">Attack Prevention</h4>
              </div>
              <p className="text-sm text-muted-foreground">2/2 tests passed</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Replay attack protection</li>
                <li>• Timestamp validation</li>
                <li>• Duplicate detection</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-green-500" />
                <h4 className="font-bold text-green-400">Rate Limiting</h4>
              </div>
              <p className="text-sm text-muted-foreground">Configured</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Wallet: 5 req/min</li>
                <li>• Transactions: 10 req/min</li>
                <li>• IP blacklisting</li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-4 border-t border-green-500/20">
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">SHA256</Badge>
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">ECDSA secp256k1</Badge>
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Client-Side Signing</Badge>
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">CORS Protected</Badge>
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Security Headers</Badge>
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Input Validation</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Mission */}
      <Card className="bg-card/50 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Our Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            BricsCoin aims to create a truly decentralized currency that remains accessible to hardware miners worldwide, 
            with minimal transaction fees (0.05 BRICS), and operates with full transparency as an open-source project.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <Shield className="w-8 h-8 text-primary mb-2" />
              <h4 className="font-bold">Secure</h4>
              <p className="text-sm text-muted-foreground">SHA256 PoW, the same proven algorithm as Bitcoin</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <Zap className="w-8 h-8 text-primary mb-2" />
              <h4 className="font-bold">Deflationary</h4>
              <p className="text-sm text-muted-foreground">0.05 BRICS fee per transaction - fees are BURNED (destroyed)</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <Github className="w-8 h-8 text-primary mb-2" />
              <h4 className="font-bold">Open Source</h4>
              <p className="text-sm text-muted-foreground">100% transparent, MIT licensed code</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whitepaper & GitHub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Whitepaper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Read our technical whitepaper for detailed information about BricsCoin's architecture, 
              tokenomics, and roadmap.
            </p>
            <Button 
              onClick={() => window.open('https://github.com/bricscoin26/Bricscoin26/blob/main/WHITEPAPER.md', '_blank')}
              className="w-full"
              data-testid="whitepaper-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              Read Whitepaper
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5 text-primary" />
              Source Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              BricsCoin is fully open source. Review the code, submit improvements, or run your own node.
            </p>
            <Button 
              variant="outline"
              onClick={() => window.open('https://github.com/bricscoin26/Bricscoin26', '_blank')}
              className="w-full border-white/20"
              data-testid="github-btn"
            >
              <Github className="w-4 h-4 mr-2" />
              View on GitHub
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Team */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Jabo86</h3>
              <p className="text-muted-foreground">Founder & Lead Developer</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">SHA256 Expert</Badge>
                <Badge variant="outline" className="text-xs">Blockchain Developer</Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-4">
            Passionate about decentralization and cryptocurrency. Building BricsCoin as a community-driven, 
            open-source project to bring the power of SHA256 mining to everyone.
          </p>
        </CardContent>
      </Card>

      {/* Tokenomics - Premine Transparency */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Tokenomics & Transparency
            <Badge variant="outline" className="ml-2 text-xs">Live Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <h4 className="font-bold text-primary mb-2">Total Supply</h4>
              <p className="text-2xl font-bold">{tokenomics?.total_supply?.toLocaleString() || "21,000,000"} BRICS</p>
              <p className="text-sm text-muted-foreground">Fixed, like Bitcoin</p>
            </div>
            <div className="p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
              <h4 className="font-bold text-yellow-500 mb-2">Premine ({tokenomics?.premine?.percentage || 4.76}%)</h4>
              <p className="text-2xl font-bold">{tokenomics?.premine?.amount?.toLocaleString() || "1,000,000"} BRICS</p>
              <p className="text-sm text-muted-foreground">Development & marketing</p>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-bold mb-3">Premine Allocation (Transparent)</h4>
            <div className="space-y-2">
              {tokenomics?.premine?.allocation ? (
                Object.entries(tokenomics.premine.allocation).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-muted-foreground capitalize">{key} ({value.percentage}%)</span>
                      <p className="text-xs text-muted-foreground/60">{value.description}</p>
                    </div>
                    <span className="font-mono">{value.amount?.toLocaleString()} BRICS</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Team (100%)</span>
                      <p className="text-xs text-muted-foreground/60">Founder and core team</p>
                    </div>
                    <span className="font-mono">1,000,000 BRICS</span>
                  </div>
                </>
              )}
            </div>
            {tokenomics?.premine?.note && (
              <p className="text-xs text-muted-foreground/70 mt-3 italic">
                {tokenomics.premine.note}
              </p>
            )}
          </div>

          <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <h4 className="font-bold text-green-500 mb-2">Mining Rewards (95.24%)</h4>
            <p className="text-2xl font-bold">{tokenomics?.mining_rewards?.total_available?.toLocaleString() || "20,000,000"} BRICS</p>
            <p className="text-sm text-muted-foreground">
              Block reward: {tokenomics?.mining_rewards?.current_block_reward || 50} BRICS, halving every {tokenomics?.mining_rewards?.halving_interval?.toLocaleString() || "210,000"} blocks.
            </p>
            {tokenomics?.mining_rewards?.mined_so_far > 0 && (
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-muted-foreground">
                  Mined so far: <span className="text-green-400 font-mono">{tokenomics.mining_rewards.mined_so_far?.toLocaleString()} BRICS</span>
                  ({tokenomics.mining_rewards.percentage_mined}%)
                </p>
              </div>
            )}
          </div>

          {/* Transaction Fee */}
          <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <h4 className="font-bold text-blue-500 mb-2">Transaction Fee</h4>
            <p className="text-2xl font-bold">{tokenomics?.fees?.transaction_fee || 0.05} BRICS</p>
            <p className="text-sm text-muted-foreground">
              {tokenomics?.fees?.note || "Fees are collected by miners who include transactions in blocks."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {roadmapItems.map((phase, idx) => (
              <div key={idx} className="relative pl-8 border-l-2 border-white/10 pb-6 last:pb-0">
                <div className={`absolute -left-[9px] w-4 h-4 rounded-full ${
                  phase.status === 'done' ? 'bg-green-500' : 
                  phase.status === 'current' ? 'bg-primary animate-pulse' : 'bg-white/20'
                }`} />
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold">{phase.phase}</h4>
                  {phase.status === 'done' && <Badge className="bg-green-500/20 text-green-400 text-xs">Completed</Badge>}
                  {phase.status === 'current' && <Badge className="bg-primary/20 text-primary text-xs">In Progress</Badge>}
                  {phase.status === 'upcoming' && <Badge variant="outline" className="text-xs">Upcoming</Badge>}
                </div>
                <ul className="space-y-1">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      {phase.status === 'done' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-white/30" />
                      )}
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tech Specs */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Algorithm", value: "SHA256" },
              { label: "Max Supply", value: "21M BRICS" },
              { label: "Block Reward", value: "50 BRICS" },
              { label: "Halving", value: "210,000 blocks" },
              { label: "Block Time", value: "~10 min" },
              { label: "Difficulty", value: "Dynamic" },
              { label: "TX Fees", value: "0.05 BRICS" },
              { label: "License", value: "MIT" },
            ].map((spec, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{spec.label}</p>
                <p className="font-bold text-primary">{spec.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4 pt-8">
        <h2 className="text-2xl font-bold">Ready to join the BricsCoin community?</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={() => window.location.href = '/wallet'} data-testid="get-started-btn">
            Get Started
          </Button>
          <Button variant="outline" className="border-white/20" onClick={() => window.open('https://github.com/bricscoin26/Bricscoin26', '_blank')}>
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </Button>
          <Button variant="outline" className="border-white/20" onClick={() => window.open('https://x.com/Bricscoin26', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Twitter/X
          </Button>
        </div>
      </div>
    </div>
  );
}
