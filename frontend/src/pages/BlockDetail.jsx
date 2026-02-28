import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Blocks, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check,
  ArrowRightLeft,
  User,
  Clock,
  Hash,
  Shield,
  ShieldCheck,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { getBlock } from "../lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

function InfoRow({ label, value, mono = false, copyable = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-white/5 gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${mono ? "font-mono" : ""} break-all`}>
          {value}
        </span>
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleCopy}
            data-testid={`copy-${label.toLowerCase().replace(/\s/g, '-')}`}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function BlockDetail() {
  const { index } = useParams();
  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlock() {
      try {
        const res = await getBlock(index);
        setBlock(res.data);
      } catch (error) {
        console.error("Error fetching block:", error);
        toast.error("Block not found");
      } finally {
        setLoading(false);
      }
    }

    fetchBlock();
  }, [index]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="block-detail-loading">
        <Skeleton className="h-12 w-48 bg-card" />
        <Skeleton className="h-96 bg-card" />
      </div>
    );
  }

  if (!block) {
    return (
      <div className="text-center py-12" data-testid="block-not-found">
        <Blocks className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-heading font-bold mb-2">Block Not Found</h2>
        <p className="text-muted-foreground mb-6">
          Block #{index} does not exist yet.
        </p>
        <Link to="/blockchain">
          <Button variant="outline" className="border-white/20">
            Back to Explorer
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate mining reward based on block height
  const halvings = Math.floor(block.index / 210000);
  const reward = halvings >= 64 ? 0 : 50 / Math.pow(2, halvings);

  return (
    <div className="space-y-6" data-testid="block-detail-page">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/blockchain">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Blocks className="w-6 h-6 text-primary" />
            Block #{block.index}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {block.index > 0 && (
            <Link to={`/block/${block.index - 1}`}>
              <Button variant="outline" size="sm" className="border-white/20" data-testid="prev-block-btn">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <Link to={`/block/${block.index + 1}`}>
            <Button variant="outline" size="sm" className="border-white/20" data-testid="next-block-btn">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Block Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card border-white/10" data-testid="block-info-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Block Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <InfoRow label="Block Height" value={`#${block.index}`} />
            <InfoRow label="Block Hash" value={block.hash} mono copyable />
            <InfoRow label="Previous Hash" value={block.previous_hash} mono copyable />
            <InfoRow 
              label="Timestamp" 
              value={new Date(block.timestamp).toLocaleString()} 
            />
            <InfoRow label="Block Type" value={block.block_type === "auxpow" ? "Merge Mined (AuxPoW)" : "Native PoW"} />
            <InfoRow label="Miner" value={block.miner} mono copyable />
            <InfoRow label="Nonce" value={block.nonce?.toLocaleString()} mono />
            <InfoRow label="Difficulty" value={block.difficulty} />
            <InfoRow label="Mining Reward" value={`${reward} BRICS`} />
            <InfoRow 
              label="Transactions" 
              value={`${block.transactions?.length || 0} transactions`} 
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* PQC Block Signature */}
      {block.pqc_scheme && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-card border-emerald-500/20" data-testid="block-pqc-card">
            <CardHeader className="border-b border-emerald-500/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Quantum-Safe Signature
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ml-2">
                  <Lock className="w-3 h-3" /> ML-DSA-65
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-white/5 gap-2">
                <span className="text-muted-foreground text-sm">Schema</span>
                <span className="text-sm text-emerald-400 font-medium">{block.pqc_scheme}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-white/5 gap-2">
                <span className="text-muted-foreground text-sm">ECDSA Signature</span>
                <code className="text-[10px] font-mono text-muted-foreground max-w-[300px] truncate">{block.pqc_ecdsa_signature}</code>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-white/5 gap-2">
                <span className="text-muted-foreground text-sm">ML-DSA-65 Signature</span>
                <code className="text-[10px] font-mono text-muted-foreground max-w-[300px] truncate">{block.pqc_dilithium_signature?.slice(0, 80)}...</code>
              </div>
              <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-xs text-muted-foreground">
                  Questo blocco e protetto da una firma ibrida ECDSA + ML-DSA-65 (FIPS 204), 
                  resistente agli attacchi dei computer quantistici.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AuxPoW Merge Mining Details */}
      {block.block_type === "auxpow" && block.auxpow && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <Card className="bg-card border-orange-500/20" data-testid="block-auxpow-card">
            <CardHeader className="border-b border-orange-500/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                Merge Mining (AuxPoW)
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 ml-2">
                  {(block.auxpow.parent_chain || "bitcoin").toUpperCase()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <InfoRow label="Parent Chain" value={(block.auxpow.parent_chain || "Bitcoin").charAt(0).toUpperCase() + (block.auxpow.parent_chain || "bitcoin").slice(1)} />
              <InfoRow label="Parent Block Hash" value={block.auxpow.parent_hash} mono copyable />
              <InfoRow label="Coinbase Branch Size" value={`${block.auxpow.coinbase_branch?.length || 0} nodes`} />
              <div className="p-3 rounded bg-orange-500/5 border border-orange-500/10">
                <p className="text-xs text-muted-foreground">
                  This block was mined via Auxiliary Proof of Work (AuxPoW). A Bitcoin miner embedded BricsCoin's block hash in their coinbase transaction, allowing both chains to share the same proof of work.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Transactions */}
      {block.transactions && block.transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-white/10" data-testid="block-transactions-card">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                Transactions ({block.transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {block.transactions.map((tx, idx) => (
                <Link
                  key={tx.id}
                  to={`/tx/${tx.id}`}
                  className="flex items-center justify-between p-4 border-b border-white/5 table-row-hover"
                  data-testid={`block-tx-${idx}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                      <ArrowRightLeft className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-sm">{tx.id.slice(0, 16)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.sender.slice(0, 12)}... → {tx.recipient.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-primary">{tx.amount} BRICS</span>
                  <span className="text-xs text-muted-foreground ml-1">({Math.round(parseFloat(tx.amount) * 100000000).toLocaleString()} JBS)</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Mining Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card border-white/10" data-testid="mining-info-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Mining Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-background rounded-sm border border-white/10">
                <p className="text-muted-foreground text-sm mb-1">Algorithm</p>
                <p className="font-mono text-lg text-primary">SHA256</p>
              </div>
              <div className="text-center p-4 bg-background rounded-sm border border-white/10">
                <p className="text-muted-foreground text-sm mb-1">Difficulty</p>
                <p className="font-mono text-lg">{block.difficulty?.toLocaleString() || "-"}</p>
              </div>
              <div className="text-center p-4 bg-background rounded-sm border border-white/10">
                <p className="text-muted-foreground text-sm mb-1">Mining Type</p>
                <p className={`font-mono text-lg ${block.block_type === "auxpow" ? "text-orange-400" : "text-green-500"}`}>
                  {block.block_type === "auxpow" ? "Merge Mined" : "Native PoW"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
