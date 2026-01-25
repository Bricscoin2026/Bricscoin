import { useState } from "react";
import { 
  Server, 
  Download, 
  Terminal, 
  CheckCircle2, 
  Copy, 
  Check,
  Globe,
  Cpu,
  HardDrive,
  Network,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

const nodeTranslations = {
  it: {
    title: "Esegui un Nodo",
    subtitle: "Aiuta a decentralizzare la rete BricsCoin",
    whyRunNode: "Perché Eseguire un Nodo?",
    whyReason1: "Supporti la decentralizzazione della rete",
    whyReason2: "Verifichi le transazioni in modo indipendente",
    whyReason3: "Contribuisci alla sicurezza della blockchain",
    whyReason4: "Puoi minare direttamente sul tuo nodo",
    requirements: "Requisiti Minimi",
    reqCpu: "CPU: 2+ core",
    reqRam: "RAM: 2GB+",
    reqDisk: "Disco: 20GB+ SSD",
    reqNet: "Connessione: Internet stabile",
    reqOs: "OS: Linux, macOS, Windows (con Docker)",
    quickStart: "Avvio Rapido",
    step1Title: "1. Installa Docker",
    step1Desc: "Scarica e installa Docker Desktop dal sito ufficiale",
    step2Title: "2. Scarica il Codice",
    step2Desc: "Clona il repository o scarica il codice sorgente",
    step3Title: "3. Avvia il Nodo",
    step3Desc: "Esegui il comando per avviare il tuo nodo",
    step4Title: "4. Verifica Connessione",
    step4Desc: "Il tuo nodo si sincronizzerà automaticamente con la rete",
    withMining: "Con Mining (opzionale)",
    copyCommand: "Copia Comando",
    copied: "Copiato!",
    downloadCode: "Scarica Codice Sorgente",
    viewOnGithub: "Vedi su GitHub",
    currentNodes: "Nodi Attivi nella Rete",
    seedNode: "Nodo Seed (Principale)",
    yourNode: "Il Tuo Nodo",
    advanced: "Configurazione Avanzata",
    envVars: "Variabili d'Ambiente",
    envNodeId: "ID unico del tuo nodo",
    envNodeUrl: "URL pubblico del tuo nodo (se hai IP statico)",
    envSeedNodes: "Lista dei nodi seed per la sincronizzazione",
  },
  en: {
    title: "Run a Node",
    subtitle: "Help decentralize the BricsCoin network",
    whyRunNode: "Why Run a Node?",
    whyReason1: "Support network decentralization",
    whyReason2: "Verify transactions independently",
    whyReason3: "Contribute to blockchain security",
    whyReason4: "Mine directly on your node",
    requirements: "Minimum Requirements",
    reqCpu: "CPU: 2+ cores",
    reqRam: "RAM: 2GB+",
    reqDisk: "Disk: 20GB+ SSD",
    reqNet: "Connection: Stable internet",
    reqOs: "OS: Linux, macOS, Windows (with Docker)",
    quickStart: "Quick Start",
    step1Title: "1. Install Docker",
    step1Desc: "Download and install Docker Desktop from the official website",
    step2Title: "2. Download Code",
    step2Desc: "Clone the repository or download the source code",
    step3Title: "3. Start Node",
    step3Desc: "Run the command to start your node",
    step4Title: "4. Verify Connection",
    step4Desc: "Your node will automatically sync with the network",
    withMining: "With Mining (optional)",
    copyCommand: "Copy Command",
    copied: "Copied!",
    downloadCode: "Download Source Code",
    viewOnGithub: "View on GitHub",
    currentNodes: "Active Nodes in Network",
    seedNode: "Seed Node (Main)",
    yourNode: "Your Node",
    advanced: "Advanced Configuration",
    envVars: "Environment Variables",
    envNodeId: "Unique ID for your node",
    envNodeUrl: "Public URL of your node (if you have static IP)",
    envSeedNodes: "List of seed nodes for synchronization",
  },
  es: {
    title: "Ejecutar un Nodo",
    subtitle: "Ayuda a descentralizar la red BricsCoin",
    whyRunNode: "¿Por qué Ejecutar un Nodo?",
    requirements: "Requisitos Mínimos",
    quickStart: "Inicio Rápido",
  },
  fr: {
    title: "Exécuter un Nœud",
    subtitle: "Aidez à décentraliser le réseau BricsCoin",
    whyRunNode: "Pourquoi Exécuter un Nœud?",
    requirements: "Configuration Minimale",
    quickStart: "Démarrage Rapide",
  },
  de: {
    title: "Node Betreiben",
    subtitle: "Helfen Sie, das BricsCoin-Netzwerk zu dezentralisieren",
    whyRunNode: "Warum einen Node betreiben?",
    requirements: "Mindestanforderungen",
    quickStart: "Schnellstart",
  },
  zh: {
    title: "运行节点",
    subtitle: "帮助去中心化BricsCoin网络",
    whyRunNode: "为什么要运行节点？",
    requirements: "最低要求",
    quickStart: "快速开始",
  },
  ja: {
    title: "ノードを実行",
    subtitle: "BricsCoinネットワークの分散化に貢献",
    whyRunNode: "なぜノードを実行するのか？",
    requirements: "最小要件",
    quickStart: "クイックスタート",
  },
  ru: {
    title: "Запустить Узел",
    subtitle: "Помогите децентрализовать сеть BricsCoin",
    whyRunNode: "Зачем запускать узел?",
    requirements: "Минимальные Требования",
    quickStart: "Быстрый Старт",
  },
  tr: {
    title: "Düğüm Çalıştır",
    subtitle: "BricsCoin ağını merkeziyetsizleştirmeye yardım edin",
    whyRunNode: "Neden Düğüm Çalıştırmalı?",
    requirements: "Minimum Gereksinimler",
    quickStart: "Hızlı Başlangıç",
  },
};

function CodeBlock({ code, language = "bash" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copiato!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-black/50 border border-white/10 rounded-sm p-4 overflow-x-auto">
        <code className="text-sm text-green-400 font-mono">{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default function RunNode() {
  const { language } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Get translations with fallback to English
  const t = (key) => {
    return nodeTranslations[language]?.[key] || nodeTranslations['en']?.[key] || key;
  };

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Why Run a Node */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="bg-card border-white/10 h-full">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {t('whyRunNode')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {['whyReason1', 'whyReason2', 'whyReason3', 'whyReason4'].map((key, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="bg-card border-white/10 h-full">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                {t('requirements')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('reqCpu')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('reqRam')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('reqDisk')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Network className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('reqNet')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Terminal className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('reqOs')}</span>
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
            {t('quickStart')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Step 1 */}
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm text-primary">1</span>
              {t('step1Title')}
            </h3>
            <p className="text-muted-foreground text-sm mb-3">{t('step1Desc')}</p>
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open('https://www.docker.com/products/docker-desktop/', '_blank')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Docker Desktop
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>

          {/* Step 2 */}
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm text-primary">2</span>
              {t('step2Title')}
            </h3>
            <p className="text-muted-foreground text-sm mb-3">{t('step2Desc')}</p>
            <CodeBlock code={commands.clone} />
          </div>

          {/* Step 3 */}
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm text-primary">3</span>
              {t('step3Title')}
            </h3>
            <p className="text-muted-foreground text-sm mb-3">{t('step3Desc')}</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Solo nodo:</p>
                <CodeBlock code={commands.start} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('withMining')}:</p>
                <CodeBlock code={commands.startWithMining} />
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm text-primary">4</span>
              {t('step4Title')}
            </h3>
            <p className="text-muted-foreground text-sm mb-3">{t('step4Desc')}</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Verifica stato:</p>
                <CodeBlock code={commands.checkStatus} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vedi logs:</p>
                <CodeBlock code={commands.viewLogs} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center">
              <Network className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold">{t('currentNodes')}</h3>
              <p className="text-sm text-muted-foreground">BricsCoin Network</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-bold">{t('seedNode')}</span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">bricscoin26.org</p>
              <p className="font-mono text-xs text-muted-foreground">5.161.254.163:8001</p>
            </div>
            <div className="bg-black/20 rounded-sm p-4 border-2 border-dashed border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm font-bold">{t('yourNode')}</span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">localhost:8001</p>
              <p className="text-xs text-primary mt-1">+ Aggiungi il tuo!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Config */}
      <Card className="bg-card border-white/10">
        <CardHeader 
          className="border-b border-white/10 cursor-pointer"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <CardTitle className="font-heading flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              {t('advanced')}
            </span>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="p-6">
            <h4 className="font-bold mb-3">{t('envVars')}</h4>
            <div className="space-y-3">
              <div className="bg-black/30 rounded-sm p-3">
                <code className="text-primary text-sm">NODE_ID</code>
                <p className="text-xs text-muted-foreground mt-1">{t('envNodeId')}</p>
              </div>
              <div className="bg-black/30 rounded-sm p-3">
                <code className="text-primary text-sm">NODE_URL</code>
                <p className="text-xs text-muted-foreground mt-1">{t('envNodeUrl')}</p>
              </div>
              <div className="bg-black/30 rounded-sm p-3">
                <code className="text-primary text-sm">SEED_NODES</code>
                <p className="text-xs text-muted-foreground mt-1">{t('envSeedNodes')}</p>
                <code className="text-xs text-green-400 mt-1 block">http://5.161.254.163:8001</code>
              </div>
            </div>
            
            <h4 className="font-bold mb-3 mt-6">Comandi Utili</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ferma il nodo:</p>
                <CodeBlock code={commands.stop} />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Download Links */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <Button
              className="gold-button rounded-sm"
              onClick={() => window.open('https://github.com/Bricscoin2026/Bricscoin', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('viewOnGithub')}
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open('https://bricscoin26.org/api/downloads/BricsCoin-Source.zip', '_blank')}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('downloadCode')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
