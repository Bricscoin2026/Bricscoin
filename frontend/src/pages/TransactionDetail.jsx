import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowRightLeft, 
  ChevronLeft, 
  Copy, 
  Check,
  User,
  Clock,
  Blocks,
  CheckCircle,
  Clock3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { getTransaction } from "../lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

function InfoRow({ label, value, mono = false, copyable = false, link = null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const ValueContent = () => (
    <span className={`text-sm ${mono ? "font-mono" : ""} break-all`}>
      {value}
    </span>
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-white/5 gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {link ? (
          <Link to={link} className="text-primary hover:underline">
            <ValueContent />
          </Link>
        ) : (
          <ValueContent />
        )}
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

export default function TransactionDetail() {
  const { txId } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransaction() {
      try {
        const res = await getTransaction(txId);
        setTransaction(res.data);
      } catch (error) {
        console.error("Error fetching transaction:", error);
        toast.error("Transaction not found");
      } finally {
        setLoading(false);
      }
    }

    fetchTransaction();
  }, [txId]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="tx-detail-loading">
        <Skeleton className="h-12 w-48 bg-card" />
        <Skeleton className="h-96 bg-card" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-12" data-testid="tx-not-found">
        <ArrowRightLeft className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-heading font-bold mb-2">Transaction Not Found</h2>
        <p className="text-muted-foreground mb-6">
          This transaction does not exist.
        </p>
        <Link to="/explorer?tab=transactions">
          <Button variant="outline" className="border-white/20">
            Back to Explorer
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tx-detail-page">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Link to="/explorer?tab=transactions">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-primary" />
          Transaction Details
        </h1>
      </div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`border ${transaction.confirmed ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {transaction.confirmed ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-500">Transaction Confirmed</p>
                    <p className="text-sm text-muted-foreground">
                      Included in Block #{transaction.block_index}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Clock3 className="w-6 h-6 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-500">Transaction Pending</p>
                    <p className="text-sm text-muted-foreground">
                      Waiting to be included in a block
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card border-white/10" data-testid="tx-info-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading">Transaction Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <InfoRow label="Transaction ID" value={transaction.id} mono copyable />
            <InfoRow label="Sender" value={transaction.sender} mono copyable />
            <InfoRow label="Recipient" value={transaction.recipient} mono copyable />
            <InfoRow 
              label="Amount" 
              value={`${transaction.amount} BRICS`}
            />
            <InfoRow 
              label="Timestamp" 
              value={new Date(transaction.timestamp).toLocaleString()} 
            />
            {transaction.confirmed && transaction.block_index !== null && (
              <InfoRow 
                label="Block" 
                value={`#${transaction.block_index}`}
                link={`/block/${transaction.block_index}`}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Visual Transfer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card border-white/10" data-testid="tx-visual-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Sender */}
              <div className="flex-1 text-center p-6 bg-background rounded-sm border border-white/10">
                <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">From</p>
                <p className="font-mono text-sm break-all">{transaction.sender}</p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-heading font-bold text-primary">
                    {transaction.amount}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">BRICS</span>
              </div>

              {/* Recipient */}
              <div className="flex-1 text-center p-6 bg-background rounded-sm border border-white/10">
                <User className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground mb-1">To</p>
                <p className="font-mono text-sm break-all">{transaction.recipient}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Signature */}
      {transaction.signature && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-white/10" data-testid="tx-signature-card">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading">Cryptographic Signature</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-background p-4 rounded-sm border border-white/10">
                <p className="font-mono text-xs break-all text-muted-foreground">
                  {transaction.signature}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ECDSA signature using SECP256k1 curve
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
