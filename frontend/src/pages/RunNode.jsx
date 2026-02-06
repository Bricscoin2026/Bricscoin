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
    toast.success("Comando copiato!");
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
        <h1 className="text-3xl font-heading font-bold">Avvia un Nodo BricsCoin</h1>
        <p className="text-muted-foreground">Guida passo-passo per partecipare alla rete decentralizzata</p>
      </div>

      {/* Intro Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="bg-card border-white/10 h-full">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Perché avviare un nodo?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Supporti la decentralizzazione della rete</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Verifichi le transazioni in modo indipendente</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Contribuisci alla sicurezza della blockchain</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Puoi minare direttamente sul tuo nodo</span>
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
                Requisiti Minimi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-muted-foreground" />
                  <span><strong>CPU:</strong> 2 core o più</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <span><strong>RAM:</strong> 2GB minimo (4GB consigliati)</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <span><strong>Disco:</strong> 20GB SSD</span>
                </li>
                <li className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-muted-foreground" />
                  <span><strong>Connessione:</strong> Internet stabile</span>
                </li>
                <li className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-muted-foreground" />
                  <span><strong>Sistema:</strong> Linux (Ubuntu/Debian consigliato)</span>
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
            Quanto costa un server?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-4">Puoi noleggiare un server VPS economico da questi provider:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="https://www.hetzner.com/cloud" target="_blank" rel="noopener noreferrer" className="block p-4 bg-black/30 rounded-sm border border-white/10 hover:border-primary/50 transition-colors">
              <h4 className="font-medium text-primary">Hetzner (Consigliato)</h4>
              <p className="text-2xl font-bold mt-1">€4-5/mese</p>
              <p className="text-xs text-muted-foreground">CPX11 - 2 vCPU, 2GB RAM</p>
            </a>
            <a href="https://www.digitalocean.com" target="_blank" rel="noopener noreferrer" className="block p-4 bg-black/30 rounded-sm border border-white/10 hover:border-primary/50 transition-colors">
              <h4 className="font-medium text-primary">DigitalOcean</h4>
              <p className="text-2xl font-bold mt-1">$6/mese</p>
              <p className="text-xs text-muted-foreground">Basic Droplet - 1GB RAM</p>
            </a>
            <a href="https://www.vultr.com" target="_blank" rel="noopener noreferrer" className="block p-4 bg-black/30 rounded-sm border border-white/10 hover:border-primary/50 transition-colors">
              <h4 className="font-medium text-primary">Vultr</h4>
              <p className="text-2xl font-bold mt-1">$5/mese</p>
              <p className="text-xs text-muted-foreground">Cloud Compute - 1GB RAM</p>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Step by Step Guide */}
      <div className="space-y-4">
        <h2 className="text-2xl font-heading font-bold gold-text">Guida Passo-Passo</h2>
        
        {/* Step 1 */}
        <StepCard number={1} title="Crea un server VPS">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Vai su <a href="https://www.hetzner.com/cloud" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Hetzner Cloud</a> e crea un account.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Clicca su <strong>&quot;Add Server&quot;</strong></li>
              <li>Scegli la location <strong>&quot;Europe&quot;</strong> (più vicina = più veloce)</li>
              <li>Seleziona <strong>&quot;Ubuntu 22.04&quot;</strong> come sistema operativo</li>
              <li>Scegli il piano <strong>&quot;CPX11&quot;</strong> (€4.15/mese)</li>
              <li>Clicca su <strong>&quot;Create &amp; Buy Now&quot;</strong></li>
              <li>Riceverai via email l&apos;<strong>indirizzo IP</strong> e la <strong>password</strong></li>
            </ol>
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm">Salva l&apos;indirizzo IP e la password - ti serviranno per connetterti!</p>
            </div>
          </div>
        </StepCard>

        {/* Step 2 */}
        <StepCard number={2} title="Connettiti al server">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Apri il <strong>Terminale</strong> (Mac/Linux) o <strong>PowerShell</strong> (Windows) e connettiti:
            </p>
            <CommandBlock 
              title="Connessione SSH"
              command="ssh root@TUO_INDIRIZZO_IP"
              description="Sostituisci TUO_INDIRIZZO_IP con l'IP del tuo server (es: 123.456.78.90)"
            />
            <p className="text-sm text-muted-foreground">
              Ti chiederà la password - inseriscila (non vedrai i caratteri mentre scrivi, è normale).
            </p>
          </div>
        </StepCard>

        {/* Step 3 */}
        <StepCard number={3} title="Installa Docker">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Copia e incolla questo comando per installare Docker automaticamente:
            </p>
            <CommandBlock 
              title="Installa Docker"
              command="curl -fsSL https://get.docker.com | sh"
              description="Questo comando scarica e installa Docker. Attendi 1-2 minuti."
            />
          </div>
        </StepCard>

        {/* Step 4 */}
        <StepCard number={4} title="Scarica BricsCoin">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Scarica il codice del nodo BricsCoin:
            </p>
            <CommandBlock 
              title="Scarica il codice"
              command={`git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin/bricscoin-node`}
              description="Questo scarica il codice e entra nella cartella del nodo"
            />
          </div>
        </StepCard>

        {/* Step 5 */}
        <StepCard number={5} title="Configura il tuo nodo">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Crea il file di configurazione:
            </p>
            <CommandBlock 
              title="Crea configurazione"
              command="cp .env.example .env"
            />
            <p className="text-muted-foreground mt-4">
              Ora modifica il file con il tuo indirizzo IP:
            </p>
            <CommandBlock 
              title="Apri l'editor"
              command="nano .env"
            />
            <p className="text-sm text-muted-foreground">
              Modifica queste righe (sostituisci con i tuoi dati):
            </p>
            <pre className="bg-black/50 p-4 rounded-sm text-sm font-mono text-yellow-400 border border-white/10">
{`NODE_ID=mio-nodo-bricscoin
NODE_URL=http://TUO_IP:8001
SEED_NODES=https://bricscoin26.org`}
            </pre>
            <p className="text-sm text-muted-foreground">
              Per salvare: premi <strong>CTRL+X</strong>, poi <strong>Y</strong>, poi <strong>INVIO</strong>
            </p>
          </div>
        </StepCard>

        {/* Step 6 */}
        <StepCard number={6} title="Avvia il nodo">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Avvia il nodo con questo comando:
            </p>
            <CommandBlock 
              title="Avvia"
              command="docker compose --env-file .env up -d"
              description="Il nodo si avvierà in background e si sincronizzerà automaticamente"
            />
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm">Il tuo nodo è attivo! Si sincronizzerà con la rete in pochi minuti.</p>
            </div>
          </div>
        </StepCard>

        {/* Step 7 */}
        <StepCard number={7} title="Verifica che funzioni">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Controlla che il nodo sia attivo:
            </p>
            <CommandBlock 
              title="Stato container"
              command="docker compose ps"
              description="Dovresti vedere 'running' accanto a bricscoin-node e bricscoin-db"
            />
            <CommandBlock 
              title="Verifica API"
              command="curl http://localhost:8001/api/network/stats"
              description="Dovresti vedere statistiche della rete in formato JSON"
            />
            <CommandBlock 
              title="Guarda i log"
              command="docker compose logs -f"
              description="Premi CTRL+C per uscire dai log"
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
              Comandi Utili
            </span>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="p-6 space-y-4">
            <CommandBlock 
              title="Riavvia il nodo" 
              command="docker compose --env-file .env restart" 
              description="Utile se ci sono problemi" 
            />
            <CommandBlock 
              title="Ferma il nodo" 
              command="docker compose down" 
              description="Ferma tutti i container" 
            />
            <CommandBlock 
              title="Aggiorna il nodo" 
              command={`cd ~/Bricscoin
git pull
docker compose --env-file .env up -d --build`}
              description="Scarica l'ultima versione e riavvia" 
            />
            <CommandBlock 
              title="Controlla spazio disco" 
              command="df -h" 
              description="Verifica che ci sia spazio disponibile" 
            />
          </CardContent>
        )}
      </Card>

      {/* Help */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-heading font-bold">Hai bisogno di aiuto?</h3>
              <p className="text-sm text-muted-foreground">Contattaci su Telegram o apri una issue su Codeberg</p>
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
