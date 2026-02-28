import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  FileText,
  Code,
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
  RefreshCw,
  Atom,
  Loader2,
  XCircle,
  Globe,
  Wallet,
  Pickaxe,
  Network,
  HelpCircle,
  ArrowRight,
  Eye
} from "lucide-react";
import { getTokenomics } from "../lib/api";
import api from "../lib/api";
import { motion } from "framer-motion";

const ICON_MAP = {
  "check-circle": CheckCircle,
  "lock": Lock,
  "atom": Atom,
  "shield-alert": AlertTriangle,
  "eye-off": Eye,
  "shield-check": ShieldCheck,
};

function AuditCategory({ category }) {
  const Icon = ICON_MAP[category.icon] || CheckCircle;
  const allPassed = category.passed === category.total;
  return (
    <div className="p-4 bg-card/80 rounded-sm border border-white/10" data-testid={`audit-${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${allPassed ? "text-emerald-400" : "text-red-400"}`} />
          <h4 className="font-bold text-sm">{category.name}</h4>
        </div>
        <span className={`text-sm font-mono font-bold ${allPassed ? "text-emerald-400" : "text-red-400"}`}>
          {category.passed}/{category.total}
        </span>
      </div>
      <div className="space-y-1.5">
        {category.tests.map((test, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {test.passed
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            }
            <span className="text-muted-foreground">{test.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoSection({ icon: Icon, title, children, color = "primary", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
    >
      <Card className="bg-card/50 border-white/10 overflow-hidden" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-sm bg-${color}/10 flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 text-${color}`} />
            </div>
            <div className="space-y-3 min-w-0">
              <h3 className="text-lg sm:text-xl font-heading font-bold">{title}</h3>
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-2">
                {children}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function About() {
  const [tokenomics, setTokenomics] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getTokenomics();
        setTokenomics(res.data);
      } catch (error) {
        console.error("Error fetching tokenomics:", error);
      }
    }
    fetchData();
  }, []);

  const runAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get("/security/audit");
      setAudit(res.data);
    } catch (error) {
      console.error("Error running audit:", error);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => { runAudit(); }, []);

  return (
    <div className="space-y-8 pb-12" data-testid="about-page">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 py-4"
      >
        <h1 className="text-4xl sm:text-5xl font-heading font-bold">
          Cos'è <span className="gold-text">BricsCoin</span>?
        </h1>
        <p className="text-sm font-medium text-primary/80 tracking-wide">
          <span className="text-lg font-bold text-primary">B</span>lockchain{" "}
          <span className="text-lg font-bold text-primary">R</span>esilient{" "}
          <span className="text-lg font-bold text-primary">I</span>nfrastructure for{" "}
          <span className="text-lg font-bold text-primary">C</span>ryptographic{" "}
          <span className="text-lg font-bold text-primary">S</span>ecurity &mdash;{" "}
          <span className="text-lg font-bold text-primary">C</span>ertified{" "}
          <span className="text-lg font-bold text-primary">O</span>pen{" "}
          <span className="text-lg font-bold text-primary">I</span>nnovation{" "}
          <span className="text-lg font-bold text-primary">N</span>etwork
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
          Immagina dei soldi digitali che nessuno controlla, nessuna banca, nessun governo, nessuna azienda.
          BricsCoin è esattamente questo: una moneta digitale libera, sicura e trasparente.
        </p>
      </motion.div>

      {/* Simple Explanation Sections */}
      <div className="space-y-4">

        <InfoSection icon={HelpCircle} title="In parole semplici" color="primary" delay={1}>
          <p>
            BricsCoin è una <strong className="text-foreground">criptovaluta</strong>, cioè una moneta digitale che esiste solo su internet.
            Come l'euro o il dollaro, puoi usarla per inviare e ricevere pagamenti. Ma a differenza delle monete tradizionali,
            non c'è nessuna banca o istituzione che la controlla.
          </p>
          <p>
            Funziona grazie a una tecnologia chiamata <strong className="text-foreground">blockchain</strong>: un registro pubblico dove
            ogni transazione viene scritta in modo permanente e verificabile da tutti. Nessuno può cancellare o modificare una transazione
            una volta confermata.
          </p>
        </InfoSection>

        <InfoSection icon={Shield} title="Sicurezza" color="emerald" delay={2}>
          <p>
            BricsCoin usa lo stesso sistema di sicurezza di Bitcoin: l'algoritmo <strong className="text-foreground">SHA-256</strong>.
            Per intenderci, è lo stesso livello di crittografia usato dalle banche e dai governi di tutto il mondo.
          </p>
          <p>
            Ma BricsCoin va oltre: integra anche la <strong className="text-foreground">crittografia post-quantistica (PQC)</strong>,
            un sistema di protezione progettato per resistere anche ai futuri computer quantistici. Questo significa che i tuoi fondi
            sono protetti non solo oggi, ma anche nel futuro.
          </p>
          <p>
            Le transazioni vengono <strong className="text-foreground">firmate direttamente nel tuo browser</strong>.
            La tua chiave privata (la "password" del tuo wallet) non lascia mai il tuo dispositivo.
          </p>
        </InfoSection>

        <InfoSection icon={Network} title="Decentralizzazione" color="primary" delay={3}>
          <p>
            <strong className="text-foreground">Decentralizzato</strong> significa che non esiste un singolo punto di controllo.
            La rete BricsCoin è composta da tanti computer indipendenti (chiamati <strong className="text-foreground">nodi</strong>)
            sparsi nel mondo che collaborano tra loro.
          </p>
          <p>
            Se un nodo si spegne, gli altri continuano a funzionare. Nessuno può censurare le transazioni o spegnere la rete.
            Chiunque può scaricare il software e far funzionare un nodo dal proprio computer, contribuendo alla sicurezza della rete.
          </p>
          <p>
            I nodi comunicano tra loro tramite una rete <strong className="text-foreground">peer-to-peer (P2P)</strong>,
            lo stesso principio usato per condividere file su internet. Non c'è un server centrale: tutti sono uguali.
          </p>
        </InfoSection>

        <InfoSection icon={Wallet} title="Il Wallet (Portafoglio)" color="primary" delay={4}>
          <p>
            Il <strong className="text-foreground">wallet</strong> è il tuo portafoglio digitale. Funziona come un'app bancaria,
            ma senza banca. Ti permette di:
          </p>
          <ul className="list-none space-y-1.5 ml-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Ricevere</strong> BRICS da chiunque, condividendo il tuo indirizzo</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Inviare</strong> BRICS a qualsiasi indirizzo nel mondo</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Controllare il saldo</strong> e la cronologia delle transazioni</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Esportare e importare</strong> il wallet con una seed phrase di 12 parole</span>
            </li>
          </ul>
          <p>
            La <strong className="text-foreground">seed phrase</strong> è una serie di 12 parole che funziona come backup del tuo wallet.
            Se perdi il dispositivo, puoi recuperare i tuoi fondi inserendo queste 12 parole. Conservala in un posto sicuro e non condividerla mai!
          </p>
        </InfoSection>

        <InfoSection icon={Pickaxe} title="Il Mining" color="primary" delay={5}>
          <p>
            Il <strong className="text-foreground">mining</strong> è il processo con cui vengono creati nuovi BRICS e verificate le transazioni.
            I miner (minatori) usano la potenza del proprio computer per risolvere problemi matematici complessi.
            Chi trova la soluzione per primo, aggiunge un nuovo "blocco" alla blockchain e riceve una ricompensa.
          </p>
          <p>
            Attualmente, ogni blocco minato produce <strong className="text-foreground">50 BRICS</strong> come ricompensa.
            Questa ricompensa si dimezza ogni 210.000 blocchi (come Bitcoin), rendendo BRICS sempre più raro nel tempo.
          </p>
          <p>
            BricsCoin è stato lanciato con un <strong className="text-foreground">Fair Launch al 100%</strong>: nessun premine,
            nessuna riserva per i fondatori. Tutti i 21 milioni di BRICS possono essere ottenuti solo tramite mining.
          </p>
        </InfoSection>

        <InfoSection icon={Eye} title="Trasparenza" color="primary" delay={6}>
          <p>
            Tutto in BricsCoin è <strong className="text-foreground">pubblico e verificabile</strong>.
            Il codice sorgente è aperto (open source) e disponibile su Codeberg. Chiunque può leggere, verificare e contribuire al codice.
          </p>
          <p>
            Ogni transazione, ogni blocco, ogni indirizzo è visibile nel <strong className="text-foreground">Block Explorer</strong>
            del sito. Non ci sono operazioni nascoste o segrete.
          </p>
        </InfoSection>
      </div>

      {/* Security Audit - Live */}
      <Card className="bg-card border-emerald-500/20 overflow-hidden relative" data-testid="security-audit-section">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          background: "radial-gradient(ellipse at 20% 50%, #10b981, transparent 70%)"
        }} />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Audit di Sicurezza
              {audit?.all_passed && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
                  {audit.total_passed}/{audit.total_tests} SUPERATI
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={runAudit}
              disabled={auditLoading}
              className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-sm"
              data-testid="run-audit-btn"
            >
              {auditLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {auditLoading ? "Esecuzione..." : "Esegui Audit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <p className="text-muted-foreground text-sm">
            Questo audit esegue test di sicurezza reali in tempo reale sulla blockchain. Verifica la crittografia classica e
            post-quantistica, il protocollo privacy (Ring Signatures, Stealth Addresses, zk-STARKs), le 11 regole di consenso
            enforced e la prevenzione degli attacchi.
          </p>

          {audit ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {audit.categories.map((cat, i) => (
                  <AuditCategory key={i} category={cat} />
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">SHA-256</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">ECDSA secp256k1</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">ML-DSA-65 (FIPS 204)</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">Firma Client-Side</Badge>
              </div>

              {audit.timestamp && (
                <p className="text-xs text-muted-foreground/50 pt-2">
                  Ultimo audit: {new Date(audit.timestamp).toLocaleString("it-IT")}
                </p>
              )}
            </>
          ) : auditLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="ml-3 text-muted-foreground">Esecuzione test di sicurezza...</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Tokenomics Simplified */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Numeri Chiave
            <Badge variant="outline" className="ml-2 text-xs">Dati Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-primary/5 rounded-sm border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Massima Fornitura</p>
              <p className="text-xl font-heading font-bold gold-text">21.000.000</p>
              <p className="text-xs text-muted-foreground">BRICS totali</p>
            </div>
            <div className="p-4 bg-emerald-500/5 rounded-sm border border-emerald-500/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Premine</p>
              <p className="text-xl font-heading font-bold text-emerald-400">0%</p>
              <p className="text-xs text-muted-foreground">Fair Launch</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-sm border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Ricompensa Blocco</p>
              <p className="text-xl font-heading font-bold gold-text">{tokenomics?.mining_rewards?.current_block_reward || 50}</p>
              <p className="text-xs text-muted-foreground">BRICS per blocco</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-sm border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Fee Transazione</p>
              <p className="text-xl font-heading font-bold gold-text">0.000005</p>
              <p className="text-xs text-muted-foreground">BRICS (quasi zero)</p>
            </div>
          </div>

          {tokenomics?.mining_rewards?.mined_so_far > 0 && (
            <div className="p-4 bg-card rounded-sm border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Minati finora</span>
                <span className="text-sm font-mono font-bold gold-text">
                  {tokenomics.mining_rewards.mined_so_far?.toLocaleString()} BRICS
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(tokenomics.mining_rewards.percentage_mined, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {tokenomics.mining_rewards.percentage_mined}% del totale
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tech Specs */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle>Specifiche Tecniche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Algoritmo", value: "SHA-256" },
              { label: "Fornitura Max", value: "21M BRICS" },
              { label: "Ricompensa", value: "50 BRICS" },
              { label: "Halving", value: "210.000 blocchi" },
              { label: "Tempo Blocco", value: "~10 min" },
              { label: "Difficolta", value: "Dinamica" },
              { label: "Fee TX", value: "0.000005 BRICS" },
              { label: "Post-Quantistico", value: "ML-DSA-65" },
              { label: "Firme", value: "ECDSA + PQC" },
              { label: "Firma Client", value: "Nel browser" },
              { label: "Licenza", value: "MIT" },
              { label: "Mining", value: "Aperto a tutti" },
            ].map((spec, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-sm text-center">
                <p className="text-xs text-muted-foreground">{spec.label}</p>
                <p className="font-bold text-primary text-sm">{spec.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-sm border border-primary/10">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Jabo86</h3>
              <p className="text-muted-foreground">Fondatore & Lead Developer</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">SHA-256</Badge>
                <Badge variant="outline" className="text-xs">Blockchain</Badge>
                <Badge variant="outline" className="text-xs">PQC</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whitepaper & Source */}
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
              Il documento tecnico ufficiale con tutti i dettagli su architettura, tokenomics e roadmap di BricsCoin.
            </p>
            <Button
              onClick={() => window.location.href = '/whitepaper'}
              className="w-full"
              data-testid="whitepaper-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              Leggi il Whitepaper
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              Codice Sorgente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              BricsCoin è completamente open source. Chiunque può leggere il codice, proporre miglioramenti o eseguire un proprio nodo.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('https://codeberg.org/Bricscoin_26/Bricscoin', '_blank')}
              className="w-full border-white/20"
              data-testid="codeberg-btn"
            >
              <Code className="w-4 h-4 mr-2" />
              Vedi su Codeberg
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 pt-8">
        <h2 className="text-xl sm:text-2xl font-heading font-bold">Pronto a scoprire BricsCoin?</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Crea il tuo primo wallet in pochi secondi. Non servono documenti, email o registrazioni.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={() => window.location.href = '/wallet'} data-testid="get-started-btn">
            <Wallet className="w-4 h-4 mr-2" />
            Crea il tuo Wallet
          </Button>
          <Button variant="outline" className="border-white/20" onClick={() => window.location.href = '/blockchain'}>
            <Globe className="w-4 h-4 mr-2" />
            Esplora la Blockchain
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
