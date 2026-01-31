import { useState } from "react";
import { Users, Copy, Server, Globe, Zap, Shield, ExternalLink, CheckCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const COMMUNITY_POOLS = [
  {
    id: "official",
    name: "BricsCoin Official Pool",
    url: "stratum+tcp://stratum.bricscoin26.org:3333",
    website: "https://bricscoin26.org",
    fee: "0%",
    minPayout: "1 BRICS",
    location: "Europe (Germany)",
    status: "online",
    featured: true,
    description: "Official pool managed by the BricsCoin team. Zero fees, direct payments to your wallet."
  },
];

export default function Pools() {
  const [pools] = useState(COMMUNITY_POOLS);
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-heading font-bold"><span className="gold-text">Mining Pools</span></h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Join a pool to mine BricsCoin together with other miners.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-white/10"><CardContent className="p-4 text-center"><Users className="w-8 h-8 text-primary mx-auto mb-2" /><p className="text-2xl font-bold text-primary">{pools.length}</p><p className="text-xs text-muted-foreground">Active Pools</p></CardContent></Card>
        <Card className="bg-card border-white/10"><CardContent className="p-4 text-center"><Globe className="w-8 h-8 text-primary mx-auto mb-2" /><p className="text-2xl font-bold text-primary">Global</p><p className="text-xs text-muted-foreground">Coverage</p></CardContent></Card>
        <Card className="bg-card border-white/10"><CardContent className="p-4 text-center"><Shield className="w-8 h-8 text-primary mx-auto mb-2" /><p className="text-2xl font-bold text-primary">0%</p><p className="text-xs text-muted-foreground">Official Pool Fee</p></CardContent></Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2"><Server className="w-6 h-6 text-primary" />Available Pools</h2>
        {pools.map((pool) => (
          <Card key={pool.id} className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <CardTitle className="font-heading text-xl">{pool.name}<span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">OFFICIAL</span></CardTitle>
                </div>
                <span className="text-sm px-3 py-1 rounded-full bg-green-500/20 text-green-400">Online</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-muted-foreground">{pool.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Fee</p><p className="font-bold text-primary">{pool.fee}</p></div>
                <div className="bg-black/20 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Min Payout</p><p className="font-bold text-primary">{pool.minPayout}</p></div>
                <div className="bg-black/20 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Location</p><p className="font-bold text-primary text-sm">{pool.location}</p></div>
                <div className="bg-black/20 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Protocol</p><p className="font-bold text-primary">Stratum V1</p></div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Connection</h4>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 bg-black/40 rounded-lg border border-primary/20">
                  <code className="text-primary font-mono text-sm flex-1 break-all">{pool.url}</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(pool.url)} className="shrink-0"><Copy className="w-4 h-4 mr-1" />Copy</Button>
                </div>
              </div>
              <div className="flex justify-end"><a href={pool.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm"><ExternalLink className="w-4 h-4" />Visit website</a></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-white/10">
        <CardHeader><CardTitle className="font-heading flex items-center gap-2"><CheckCircle className="w-5 h-5 text-primary" />How to Connect</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-black/20 rounded-lg"><div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold mb-3">1</div><h4 className="font-semibold mb-2">Choose a Pool</h4><p className="text-sm text-muted-foreground">Select a pool from the list above.</p></div>
            <div className="p-4 bg-black/20 rounded-lg"><div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold mb-3">2</div><h4 className="font-semibold mb-2">Configure Miner</h4><p className="text-sm text-muted-foreground">Enter the pool URL in your miner settings.</p></div>
            <div className="p-4 bg-black/20 rounded-lg"><div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold mb-3">3</div><h4 className="font-semibold mb-2">Set Worker Name</h4><p className="text-sm text-muted-foreground">Use your wallet address as worker name.</p></div>
            <div className="p-4 bg-black/20 rounded-lg"><div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold mb-3">4</div><h4 className="font-semibold mb-2">Start Mining!</h4><p className="text-sm text-muted-foreground">Start your miner and check your earnings.</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10">
        <CardHeader><CardTitle className="font-heading">Supported Hardware</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[{name:"Bitaxe",hr:"~1.2 TH/s",t:"ASIC"},{name:"NerdQaxe",hr:"~4.8 TH/s",t:"ASIC"},{name:"NerdMiner",hr:"~350 kH/s",t:"ESP32"},{name:"Antminer S19",hr:"~95 TH/s",t:"ASIC"},{name:"Antminer S21",hr:"~200 TH/s",t:"ASIC"},{name:"Whatsminer M50",hr:"~120 TH/s",t:"ASIC"}].map((hw)=>(<div key={hw.name} className="flex items-center justify-between p-3 bg-black/20 rounded-lg"><div><p className="font-semibold">{hw.name}</p><p className="text-xs text-muted-foreground">{hw.t}</p></div><span className="text-primary font-mono text-sm">{hw.hr}</span></div>))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Plus className="w-8 h-8 text-primary" /><div><h3 className="font-heading font-bold">Running a Pool?</h3><p className="text-sm text-muted-foreground">Contact us to be added to the list!</p></div></div>
          <a href="https://x.com/Bricscoin26" target="_blank" rel="noopener noreferrer"><Button variant="outline" className="border-primary/50 hover:bg-primary/10"><ExternalLink className="w-4 h-4 mr-2" />Contact us on X</Button></a>
        </CardContent>
      </Card>
    </div>
  );
}
