import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Link2, Pickaxe, Shield, CheckCircle, Copy, ChevronRight,
  Cpu, Activity, Zap, ArrowRight, Server, Globe, Lock,
  AlertTriangle, HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

function copyText(text) {
  navigator.clipboard.writeText(text);
  toast.success("Copied!");
}

function CodeBlock({ code, title }) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/60">
      {title && (
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
          <button onClick={() => copyText(code)} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-emerald-400/90 leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function StepCard({ number, title, children, color = "#F59E0B" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: number * 0.08 }}
      className="flex gap-5 py-8 border-b border-white/[0.04] last:border-0"
    >
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
          {String(number).padStart(2, "0")}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-bold text-lg mb-3">{title}</h3>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
      </div>
    </motion.div>
  );
}

export default function MergeMiningGuide() {
  const [auxpowStatus, setAuxpowStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API}/api/auxpow/status`);
        if (res.ok) setAuxpowStatus(await res.json());
      } catch {}
    };
    fetchStatus();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-16" data-testid="merge-mining-guide">

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 mb-6">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-medium text-orange-400 tracking-wide">MERGE MINING ACTIVE</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-black mb-4">
          Merge Mining{" "}
          <span className="text-orange-400">(AuxPoW)</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Guida completa per i pool operator e i miner Bitcoin. 
          Mina BricsCoin insieme a Bitcoin a costo zero.
        </p>
      </motion.div>

      {/* LIVE STATUS */}
      {auxpowStatus && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-orange-500/20 bg-orange-500/[0.03]" data-testid="auxpow-live-status">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-orange-400">{auxpowStatus.statistics?.auxpow_blocks || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Blocchi AuxPoW</p>
                </div>
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">{auxpowStatus.statistics?.native_blocks || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Blocchi Nativi</p>
                </div>
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{auxpowStatus.statistics?.auxpow_percentage || 0}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Merge Mined</p>
                </div>
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{auxpowStatus.current_difficulty?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Difficulty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* COS'E' IL MERGE MINING */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <Link2 className="w-7 h-7 text-orange-400" />
          Cos'e il Merge Mining?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Il <strong className="text-foreground">Merge Mining</strong> (o Auxiliary Proof of Work - AuxPoW) permette ai miner Bitcoin di minare 
            BricsCoin <strong className="text-orange-400">simultaneamente, a costo zero</strong>. Non serve hardware aggiuntivo, 
            non serve energia extra. Lo stesso lavoro computazionale che protegge Bitcoin protegge anche BricsCoin.
          </p>
          <p>
            E come se un postino, mentre consegna lettere nella tua via, raccogliesse anche i pacchi di un altro corriere. 
            Stesso percorso, doppio lavoro utile.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { icon: Shield, title: "Sicurezza Massima", desc: "L'hashrate di Bitcoin protegge BricsCoin. Un attacco 51% diventa praticamente impossibile.", color: "#10B981" },
              { icon: Zap, title: "Zero Costi Extra", desc: "I miner Bitcoin non consumano energia aggiuntiva. Il PoW conta per entrambe le chain.", color: "#F59E0B" },
              { icon: Lock, title: "Piena Indipendenza", desc: "BricsCoin mantiene la sua blockchain, le sue regole, il suo consenso. Bitcoin non controlla nulla.", color: "#3B82F6" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <item.icon className="w-6 h-6 mb-3" style={{ color: item.color }} />
                <h4 className="font-bold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <Cpu className="w-7 h-7 text-orange-400" />
          Come Funziona (Passo per Passo)
        </h2>
        <div className="p-6 rounded-lg border border-orange-500/15 bg-orange-500/[0.02]">
          <StepCard number={1} title="Il pool richiede un work template a BricsCoin">
            <p>Il pool di merge mining chiama l'API di BricsCoin per ottenere il blocco da minare:</p>
            <CodeBlock
              title="GET /api/auxpow/create-work"
              code={`curl "${API}/api/auxpow/create-work?miner_address=IL_TUO_INDIRIZZO_BRICS"

# Risposta:
{
  "work_id": "abc12345",
  "block_hash": "e734e7d6...",        // Hash del blocco BricsCoin
  "coinbase_commitment": "42524943...", // Dati da inserire nel coinbase
  "difficulty": 2760888,
  "reward": 50                          // Ricompensa in BRICS
}`}
            />
          </StepCard>

          <StepCard number={2} title="Il pool inserisce l'hash BricsCoin nel coinbase Bitcoin">
            <p>
              Il pool prende il campo <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">coinbase_commitment</code> e 
              lo inserisce nello <strong>scriptSig della coinbase transaction</strong> del blocco Bitcoin che sta minando.
            </p>
            <p>
              Formato: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">BRIC</code> (4 bytes magic) + 
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">block_hash</code> (32 bytes)
            </p>
            <div className="p-3 bg-black/30 rounded-lg border border-white/5 mt-2">
              <p className="text-xs text-muted-foreground">
                Questo e esattamente come fanno Dogecoin, Namecoin e Litecoin. Il coinbase Bitcoin ha spazio per dati arbitrari 
                (come il messaggio originale di Satoshi nel Genesis Block).
              </p>
            </div>
          </StepCard>

          <StepCard number={3} title="I miner Bitcoin minano normalmente">
            <p>
              I miner Bitcoin continuano a fare esattamente quello che fanno sempre: trovare un nonce che produce un hash 
              valido per la difficulty di Bitcoin. <strong>Non cambia nulla per loro.</strong>
            </p>
            <p>
              Il pool software gestisce tutto automaticamente in background.
            </p>
          </StepCard>

          <StepCard number={4} title="Se l'hash Bitcoin soddisfa la difficulty di BricsCoin, viene inviata la prova">
            <p>
              Ogni volta che un miner trova un hash Bitcoin valido, il pool controlla se quell'hash soddisfa anche la difficulty di BricsCoin. 
              Dato che la difficulty di BricsCoin e molto piu bassa di quella di Bitcoin, questo succede frequentemente.
            </p>
            <CodeBlock
              title="POST /api/auxpow/submit"
              code={`curl -X POST "${API}/api/auxpow/submit" \\
  -H "Content-Type: application/json" \\
  -d '{
    "parent_header": "0200000...",     // Header blocco Bitcoin (80 bytes hex)
    "coinbase_tx": "01000000...",      // Coinbase transaction Bitcoin
    "coinbase_branch": ["abc...", ...], // Merkle branch del coinbase
    "coinbase_index": 0,
    "miner_address": "BRICSPQxxxx...", // Indirizzo BricsCoin del miner
    "block_hash": "e734e7d6...",       // L'hash dal work template
    "parent_chain": "bitcoin"
  }'

# Risposta successo:
{
  "success": true,
  "block_index": 2698,
  "reward": 50,
  "block_type": "auxpow"
}`}
            />
          </StepCard>

          <StepCard number={5} title="BricsCoin valida e accetta il blocco">
            <p>BricsCoin verifica 4 cose:</p>
            <ul className="list-none space-y-2 mt-2">
              {[
                "L'hash del parent header (double SHA-256) soddisfa la difficulty target di BricsCoin",
                "L'hash del blocco BricsCoin e presente nella coinbase transaction",
                "Il Merkle branch dimostra che la coinbase e nel blocco Bitcoin",
                "Il work template corrisponde (non scaduto, non gia usato)",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Se tutto e valido, il blocco viene aggiunto alla blockchain BricsCoin con tipo <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">auxpow</code> e 
              il miner riceve <strong className="text-primary">50 BRICS</strong> di ricompensa.
            </p>
          </StepCard>
        </div>
      </section>

      {/* GUIDA PER POOL OPERATOR */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <Server className="w-7 h-7 text-orange-400" />
          Guida per Pool Operator
        </h2>
        <div className="space-y-6">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5 text-orange-400" />
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-muted-foreground">Endpoint</th>
                      <th className="text-left p-3 text-muted-foreground">Metodo</th>
                      <th className="text-left p-3 text-muted-foreground">Descrizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { endpoint: "/api/auxpow/create-work", method: "GET", desc: "Ottieni un work template (hash + commitment)" },
                      { endpoint: "/api/auxpow/submit", method: "POST", desc: "Invia la prova AuxPoW" },
                      { endpoint: "/api/auxpow/status", method: "GET", desc: "Stato del merge mining e statistiche" },
                      { endpoint: "/api/auxpow/work-history", method: "GET", desc: "Storico dei work richiesti" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.04]">
                        <td className="p-3 font-mono text-xs text-orange-400">{row.endpoint}</td>
                        <td className="p-3"><Badge variant="outline" className="text-xs">{row.method}</Badge></td>
                        <td className="p-3 text-muted-foreground">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cpu className="w-5 h-5 text-orange-400" />
                Integrazione nel Pool Software
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ecco un esempio di come integrare il merge mining di BricsCoin nel tuo pool Bitcoin (pseudocodice Python):
              </p>
              <CodeBlock
                title="merge_mining_worker.py"
                code={`import requests, time

BRICSCOIN_API = "https://bricscoin26.org"
MINER_ADDRESS = "BRICSPQxxxxx..."  # Il tuo indirizzo BricsCoin

def get_bricscoin_work():
    """Richiedi un work template a BricsCoin."""
    r = requests.get(f"{BRICSCOIN_API}/api/auxpow/create-work",
                     params={"miner_address": MINER_ADDRESS})
    return r.json()

def embed_in_coinbase(coinbase_script, commitment_hex):
    """Inserisci il commitment nel coinbase scriptSig."""
    commitment_bytes = bytes.fromhex(commitment_hex)
    # Inserisci dopo il block height nel coinbase
    return coinbase_script + commitment_bytes

def on_bitcoin_block_found(btc_block_header, coinbase_tx, merkle_branch):
    """Quando trovi un blocco Bitcoin, controlla se vale per BricsCoin."""
    work = current_bricscoin_work
    
    # Invia la prova a BricsCoin
    proof = {
        "parent_header": btc_block_header.hex(),
        "coinbase_tx": coinbase_tx.hex(),
        "coinbase_branch": [h.hex() for h in merkle_branch],
        "coinbase_index": 0,
        "miner_address": MINER_ADDRESS,
        "block_hash": work["block_hash"],
        "parent_chain": "bitcoin"
    }
    
    r = requests.post(f"{BRICSCOIN_API}/api/auxpow/submit", json=proof)
    if r.json().get("success"):
        print(f"BricsCoin block mined! Reward: 50 BRICS")

# Loop principale
while True:
    current_bricscoin_work = get_bricscoin_work()
    commitment = current_bricscoin_work["coinbase_commitment"]
    # Inserisci commitment nel prossimo coinbase Bitcoin...
    time.sleep(30)  # Rinnova il work ogni 30 secondi`}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <HelpCircle className="w-7 h-7 text-orange-400" />
          Domande Frequenti
        </h2>
        <div className="space-y-3">
          {[
            {
              q: "BricsCoin perde la sua indipendenza con il merge mining?",
              a: "No, assolutamente. BricsCoin mantiene la sua blockchain separata, le sue regole e il suo consenso. Bitcoin non sa nemmeno che BricsCoin esiste. Il merge mining e un rapporto unidirezionale: BricsCoin beneficia dell'hashrate di Bitcoin, ma Bitcoin non controlla nulla."
            },
            {
              q: "Si puo rimuovere il merge mining in futuro?",
              a: "Si, e completamente reversibile. Il merge mining aggiunge un nuovo tipo di blocco (AuxPoW) accanto a quello nativo. I blocchi normali continuano a essere accettati. Per disattivarlo, basta smettere di accettare blocchi AuxPoW con un aggiornamento del protocollo."
            },
            {
              q: "I miner Bitcoin hanno bisogno di software speciale?",
              a: "No. I miner Bitcoin non devono cambiare nulla. E il pool operator che gestisce l'integrazione. I miner connessi al pool minano Bitcoin come sempre e ricevono BricsCoin extra come bonus."
            },
            {
              q: "Quanto guadagna un miner dal merge mining?",
              a: "La ricompensa attuale e di 50 BRICS per blocco (dimezza ogni 210.000 blocchi). Il miner riceve questa ricompensa in aggiunta alla normale ricompensa Bitcoin, senza costi aggiuntivi."
            },
            {
              q: "Perche il merge mining rende la rete piu sicura?",
              a: "Perche l'hashrate di Bitcoin (centinaia di EH/s) protegge anche BricsCoin. Per attaccare BricsCoin con un 51% attack, un attaccante dovrebbe avere piu hashrate di tutti i pool Bitcoin che fanno merge mining — cosa praticamente impossibile."
            },
            {
              q: "Chi usa gia il merge mining?",
              a: "Dogecoin (con Litecoin come parent), Namecoin (con Bitcoin come parent), RSK, Elastos, e molti altri. E una tecnologia collaudata usata dal 2011."
            },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="p-5 rounded-lg border border-white/[0.06] bg-white/[0.02]"
              data-testid={`faq-${i}`}
            >
              <h4 className="font-bold text-base mb-2 flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                {item.q}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">{item.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SPECIFICHE TECNICHE */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <Activity className="w-7 h-7 text-orange-400" />
          Specifiche Tecniche
        </h2>
        <Card className="border-white/10">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Chain ID", value: "0x0062 (98)" },
                { label: "Magic Bytes", value: "BRIC (0x42524943)" },
                { label: "Parent Chain", value: "Bitcoin (SHA-256d)" },
                { label: "Hash Algorithm", value: "Double SHA-256 (parent)" },
                { label: "Commitment Format", value: "BRIC + block_hash (36 bytes)" },
                { label: "Block Validation", value: "Parent PoW + Merkle Proof" },
                { label: "Compatibilita", value: "CGMiner, BFGMiner, Stratum V1" },
                { label: "Reversibilita", value: "Si — blocchi nativi sempre accettati" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-mono font-bold text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center py-12">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-4">
          Vuoi aggiungere BricsCoin al tuo pool?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Contattaci per supporto tecnico nell'integrazione. Aiutiamo i pool operator a configurare il merge mining gratuitamente.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="https://x.com/Bricscoin26" target="_blank" rel="noreferrer">
            <Button size="lg" className="gold-button rounded-sm px-8 h-12" data-testid="contact-twitter">
              <ArrowRight className="w-5 h-5 mr-2" /> Contattaci su X
            </Button>
          </a>
          <a href="https://codeberg.org/Bricscoin_26/Bricscoin" target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="border-orange-500/30 text-orange-400 rounded-sm px-8 h-12 hover:bg-orange-500/5" data-testid="view-source">
              <Globe className="w-5 h-5 mr-2" /> Codice Sorgente
            </Button>
          </a>
        </div>
      </motion.div>

    </div>
  );
}
