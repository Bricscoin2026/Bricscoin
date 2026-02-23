import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Wallet as WalletIcon, ShieldCheck, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion } from "framer-motion";
import LegacyWallet from "./Wallet";
import PQCWalletPage from "./PQCWallet";
import WalletMigrationPage from "./WalletMigration";

export default function WalletHub() {
  return (
    <div className="space-y-6" data-testid="wallet-hub-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <WalletIcon className="w-7 h-7 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">Wallet</h1>
        </div>
        <p className="text-muted-foreground">Manage your BRICS wallets — Legacy, Quantum-Proof & Migration</p>
      </motion.div>

      <Tabs defaultValue="legacy" className="space-y-5">
        <TabsList className="bg-card border border-white/10">
          <TabsTrigger value="legacy" data-testid="tab-legacy-wallet">
            <WalletIcon className="w-4 h-4 mr-2" />Legacy Wallet
          </TabsTrigger>
          <TabsTrigger value="pqc" data-testid="tab-pqc-wallet">
            <ShieldCheck className="w-4 h-4 mr-2" />PQC Wallet
          </TabsTrigger>
          <TabsTrigger value="migration" data-testid="tab-migration">
            <ArrowRight className="w-4 h-4 mr-2" />Migration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="legacy">
          <LegacyWallet embedded />
        </TabsContent>
        <TabsContent value="pqc">
          <PQCWalletPage embedded />
        </TabsContent>
        <TabsContent value="migration">
          <WalletMigrationPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
