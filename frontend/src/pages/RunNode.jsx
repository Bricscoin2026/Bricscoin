import { useState } from "react";
import { 
  Server, Download, Terminal, CheckCircle2, Copy, Check, Globe, Cpu, HardDrive, Network, ExternalLink, ChevronDown, ChevronUp, AlertCircle, Wallet
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
      {title && <h4 className="font-medium text-sm text-primary">{title}</h4>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="relative group">
        <pre className="bg-black/50 p-4 rounded-sm overflow-x-auto text-sm font-mono text-green-400 border border-white/10 whitespace-pre-wrap">
          {command}
        </pre>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={copyCommand}
          data-testid="copy-command-btn"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function StepCard({ number, title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: number * 0.1 }}
    >
      <Card className="bg-card border-white/10" data-testid={`step-${number}`}>
        <CardHeader className="border-b border-white/10 bg-primary/5">
          <CardTitle className="font-heading flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-bold text-lg">
              {number}
            </div>
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function RunNode() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6" data-testid="run-node-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Run a BricsCoin Node</h1>
        <p className="text-muted-foreground">Step-by-step guide to join the decentralized network</p>
      </div>

      {/* Intro Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="bg-card border-white/10 h-full">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Why run a node?
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
                  <span>Mine directly on your own node</span>
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
                  <span><strong>CPU:</strong> 2 cores or more</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <span><strong>RAM:</strong> 2GB minimum (4GB recommended)</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <span><strong>Disk:</strong> 20GB SSD</span>
                </li>
                <li className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-muted-foreground" />
                  <span><strong>Connection:</strong> Stable internet</span>
                </li>
                <li className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-muted-foreground" />
                  <span><strong>OS:</strong> Linux (Ubuntu/Debian recommended)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cost Estimate */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            How much does a server cost?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-4">You can rent an affordable VPS server from these providers:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="https://www.hetzner.com/cloud" target="_blank" rel="noopener noreferrer" className="block p-4 bg-black/30 rounded-sm border border-white/10 hover:border-primary/50 transition-colors">
              <h4 className="font-medium text-primary">Hetzner (Recommended)</h4>
              <p className="text-2xl font-bold mt-1">$4-5/month</p>
              <p className="text-xs text-muted-foreground">CPX11 - 2 vCPU, 2GB RAM</p>
            </a>
            <a href="https://www.digitalocean.com" target="_blank" rel="noopener noreferrer" className="block p-4 bg-black/30 rounded-sm border border-white/10 hover:border-primary/50 transition-colors">
              <h4 className="font-medium text-primary">DigitalOcean</h4>
              <p className="text-2xl font-bold mt-1">$6/month</p>
              <p className="text-xs text-muted-foreground">Basic Droplet - 1GB RAM</p>
            </a>
            <a href="https://www.vultr.com" target="_blank" rel="noopener noreferrer" className="block p-4 bg-black/30 rounded-sm border border-white/10 hover:border-primary/50 transition-colors">
              <h4 className="font-medium text-primary">Vultr</h4>
              <p className="text-2xl font-bold mt-1">$5/month</p>
              <p className="text-xs text-muted-foreground">Cloud Compute - 1GB RAM</p>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Step by Step Guide */}
      <div className="space-y-4">
        <h2 className="text-2xl font-heading font-bold gold-text">Step-by-Step Guide</h2>
        
        {/* Step 1 */}
        <StepCard number={1} title="Create a VPS Server">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Go to <a href="https://www.hetzner.com/cloud" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Hetzner Cloud</a> and create an account.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click <strong>&quot;Add Server&quot;</strong></li>
              <li>Choose a location — <strong>&quot;Europe&quot;</strong> (closer = faster)</li>
              <li>Select <strong>&quot;Ubuntu 22.04&quot;</strong> as the operating system</li>
              <li>Choose the <strong>&quot;CPX11&quot;</strong> plan ($4-5/month)</li>
              <li>Click <strong>&quot;Create &amp; Buy Now&quot;</strong></li>
              <li>You will receive the <strong>IP address</strong> and <strong>password</strong> via email</li>
            </ol>
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm">Save the IP address and password — you will need them to connect!</p>
            </div>
          </div>
        </StepCard>

        {/* Step 2 */}
        <StepCard number={2} title="Connect to the Server">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Open <strong>Terminal</strong> (Mac/Linux) or <strong>PowerShell</strong> (Windows) and connect:
            </p>
            <CommandBlock 
              title="SSH Connection"
              command="ssh root@YOUR_SERVER_IP"
              description="Replace YOUR_SERVER_IP with your server's IP address (e.g. 123.456.78.90)"
            />
            <p className="text-sm text-muted-foreground">
              It will ask for your password — type it in (you won't see the characters as you type, this is normal).
            </p>
          </div>
        </StepCard>

        {/* Step 3 */}
        <StepCard number={3} title="Install Docker">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Copy and paste this command to install Docker automatically:
            </p>
            <CommandBlock 
              title="Install Docker"
              command="curl -fsSL https://get.docker.com | sh"
              description="This command downloads and installs Docker. Wait 1-2 minutes."
            />
          </div>
        </StepCard>

        {/* Step 4 */}
        <StepCard number={4} title="Download BricsCoin">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Download the BricsCoin node code:
            </p>
            <CommandBlock 
              title="Download the code"
              command={`git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin/bricscoin-node`}
              description="This downloads the code and enters the node folder"
            />
          </div>
        </StepCard>

        {/* Step 5 */}
        <StepCard number={5} title="Configure Your Node">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Create the configuration file:
            </p>
            <CommandBlock 
              title="Create configuration"
              command="cp .env.example .env"
            />
            <p className="text-muted-foreground mt-4">
              Now edit the file with your server's IP address:
            </p>
            <CommandBlock 
              title="Open the editor"
              command="nano .env"
            />
            <p className="text-sm text-muted-foreground">
              Edit these lines (replace with your data):
            </p>
            <pre className="bg-black/50 p-4 rounded-sm text-sm font-mono text-yellow-400 border border-white/10">
{`NODE_ID=my-bricscoin-node
NODE_URL=http://YOUR_IP:8001
SEED_NODES=https://bricscoin26.org`}
            </pre>
            <p className="text-sm text-muted-foreground">
              To save: press <strong>CTRL+X</strong>, then <strong>Y</strong>, then <strong>ENTER</strong>
            </p>
          </div>
        </StepCard>

        {/* Step 6 */}
        <StepCard number={6} title="Start the Node">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Start the node with this command:
            </p>
            <CommandBlock 
              title="Start"
              command="docker compose --env-file .env up -d"
              description="The node will start in the background and sync automatically"
            />
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm">Your node is live! It will sync with the network in a few minutes.</p>
            </div>
          </div>
        </StepCard>

        {/* Step 7 */}
        <StepCard number={7} title="Verify It Works">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Check that the node is running:
            </p>
            <CommandBlock 
              title="Container status"
              command="docker compose ps"
              description="You should see 'running' next to bricscoin-node and bricscoin-db"
            />
            <CommandBlock 
              title="Verify API"
              command="curl http://localhost:8001/api/network/stats"
              description="You should see network statistics in JSON format"
            />
            <CommandBlock 
              title="View logs"
              command="docker compose logs -f"
              description="Press CTRL+C to exit the logs"
            />
          </div>
        </StepCard>
      </div>

      {/* Advanced Section */}
      <Card className="bg-card border-white/10">
        <CardHeader 
          className="border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors" 
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <CardTitle className="font-heading flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Useful Commands
            </span>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="p-6 space-y-4">
            <CommandBlock 
              title="Restart the node" 
              command="docker compose --env-file .env restart" 
              description="Useful if you encounter issues" 
            />
            <CommandBlock 
              title="Stop the node" 
              command="docker compose down" 
              description="Stops all containers" 
            />
            <CommandBlock 
              title="Update the node" 
              command={`cd ~/Bricscoin
git pull
docker compose --env-file .env up -d --build`}
              description="Downloads the latest version and restarts" 
            />
            <CommandBlock 
              title="Check disk space" 
              command="df -h" 
              description="Verify available disk space" 
            />
          </CardContent>
        )}
      </Card>

      {/* Help */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-heading font-bold">Need help?</h3>
              <p className="text-sm text-muted-foreground">Contact us on Telegram or open an issue on Codeberg</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-white/20" asChild>
                <a href="https://codeberg.org/Bricscoin_26/Bricscoin/issues" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Codeberg
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
