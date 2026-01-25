import { useState } from "react";
import { 
  Server, Download, Terminal, CheckCircle2, Copy, Check, Globe, Cpu, HardDrive, Network, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

function CommandBlock({ title, command, description }) {
  const [copied, setCopied] = useState(false);
  
  const copyCommand = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("Command copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-2">
      {title && <h4 className="font-medium text-sm">{title}</h4>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="relative group">
        <pre className="bg-black/50 p-4 rounded-sm overflow-x-auto text-sm font-mono text-green-400 border border-white/10">
          {command}
        </pre>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={copyCommand}
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function RunNode() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const commands = {
    clone: `git clone https://github.com/Bricscoin2026/Bricscoin.git
cd Bricscoin`,
    start: `docker compose -f docker-compose.node.yml up -d`,
    startWithMining: `docker compose -f docker-compose.node.yml --profile with-mining up -d`,
    checkStatus: `docker compose -f docker-compose.node.yml ps`,
    viewLogs: `docker compose -f docker-compose.node.yml logs -f`,
    stop: `docker compose -f docker-compose.node.yml down`,
  };

  return (
    <div className="space-y-6" data-testid="run-node-page">
      <div>
        <h1 className="text-3xl font-heading font-bold">Run a Node</h1>
        <p className="text-muted-foreground">Help decentralize the BricsCoin network</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="bg-card border-white/10 h-full">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Why Run a Node?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Support network decentralization</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Verify transactions independently</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Contribute to blockchain security</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Mine directly on your node</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="bg-card border-white/10 h-full">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Minimum Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-muted-foreground" />
                  <span>CPU: 2+ cores</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <span>RAM: 2GB+</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <span>Disk: 20GB+ SSD</span>
                </li>
                <li className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-muted-foreground" />
                  <span>Connection: Stable internet</span>
                </li>
                <li className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-muted-foreground" />
                  <span>OS: Linux, macOS, Windows (with Docker)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Start */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                <div>
                  <h4 className="font-medium">Install Docker</h4>
                  <p className="text-xs text-muted-foreground">Download from docker.com</p>
                </div>
              </div>
              <Button variant="outline" className="w-full border-white/20" asChild>
                <a href="https://docker.com/get-started" target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download Docker
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                <div>
                  <h4 className="font-medium">Download Code</h4>
                  <p className="text-xs text-muted-foreground">Clone the repository</p>
                </div>
              </div>
              <CommandBlock command={commands.clone} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
              <div>
                <h4 className="font-medium">Start the Node</h4>
                <p className="text-xs text-muted-foreground">Run the command to start your node</p>
              </div>
            </div>
            <CommandBlock title="Basic (sync only)" command={commands.start} />
            <CommandBlock title="With Mining (optional)" command={commands.startWithMining} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">4</div>
              <div>
                <h4 className="font-medium">Verify Connection</h4>
                <p className="text-xs text-muted-foreground">Your node will automatically sync with the network</p>
              </div>
            </div>
            <CommandBlock command={commands.checkStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
          <CardTitle className="font-heading flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Advanced Commands
            </span>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="p-6 space-y-4">
            <CommandBlock title="View Logs" command={commands.viewLogs} description="Watch node activity in real-time" />
            <CommandBlock title="Stop Node" command={commands.stop} description="Gracefully stop your node" />
          </CardContent>
        )}
      </Card>

      {/* Download */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-heading font-bold">Download Source Code</h3>
              <p className="text-sm text-muted-foreground">Get the complete BricsCoin source code</p>
            </div>
            <Button className="gold-button rounded-sm" asChild>
              <a href="/api/downloads/BricsCoin-Source.zip">
                <Download className="w-4 h-4 mr-2" />
                Download ZIP
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
