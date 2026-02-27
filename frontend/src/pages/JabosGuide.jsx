import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Coins, ArrowRight, Wallet, Smartphone, Zap, Scale,
  Calculator, History, ChevronRight, Sparkles
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const JBS_COLOR = "#D4AF37";
const JBS_PER_BRICS = 100_000_000;

const conversionTable = [
  { brics: "1", jbs: "100,000,000" },
  { brics: "0.5", jbs: "50,000,000" },
  { brics: "0.1", jbs: "10,000,000" },
  { brics: "0.01", jbs: "1,000,000" },
  { brics: "0.001", jbs: "100,000" },
  { brics: "0.0001", jbs: "10,000" },
  { brics: "0.00001", jbs: "1,000" },
  { brics: "0.000001", jbs: "100" },
  { brics: "0.0000001", jbs: "10" },
  { brics: "0.00000001", jbs: "1" },
];

const comparisonData = [
  { feature: "Parent Coin", btc: "Bitcoin (BTC)", brics: "BricsCoin (BRICS)" },
  { feature: "Sub-unit Name", btc: "Satoshi", brics: "Jabos (JBS)" },
  { feature: "Units per Coin", btc: "100,000,000", brics: "100,000,000" },
  { feature: "Smallest Unit", btc: "0.00000001 BTC", brics: "0.00000001 BRICS" },
  { feature: "Named After", btc: "Satoshi Nakamoto (Creator)", brics: "Jabo86 (Creator)" },
  { feature: "Ticker", btc: "SAT", brics: "JBS" },
];

function SectionTitle({ icon: Icon, title, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${JBS_COLOR}15`, border: `1px solid ${JBS_COLOR}25` }}>
          <Icon className="w-5 h-5" style={{ color: JBS_COLOR }} />
        </div>
        <h2 className="text-2xl font-heading font-bold">{title}</h2>
      </div>
      {subtitle && <p className="text-muted-foreground text-sm ml-[52px]">{subtitle}</p>}
    </motion.div>
  );
}

export default function JabosGuide() {
  return (
    <div className="space-y-16 pb-16" data-testid="jabos-guide-page">

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-8"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ background: `${JBS_COLOR}15`, border: `1px solid ${JBS_COLOR}30` }}>
          <Coins className="w-10 h-10" style={{ color: JBS_COLOR }} />
        </div>
        <Badge className="mb-4 text-xs px-3 py-1" style={{ background: `${JBS_COLOR}20`, color: JBS_COLOR, border: `1px solid ${JBS_COLOR}30` }}>
          1 BRICS = 100,000,000 JBS
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black mb-4">
          Meet the <span style={{ color: JBS_COLOR }}>Jabos</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The smallest unit of BricsCoin. Just like Bitcoin has the Satoshi,
          BricsCoin has the <strong style={{ color: JBS_COLOR }}>Jabos (JBS)</strong> — named after
          its creator, <strong>Jabo86</strong>.
        </p>
      </motion.div>

      {/* What is a Jabos */}
      <section>
        <SectionTitle icon={Sparkles} title="What is a Jabos?" subtitle="The atomic unit of BricsCoin" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "The Smallest Piece",
              desc: "A Jabos is the smallest indivisible unit of BricsCoin. It represents 0.00000001 BRICS — one hundred-millionth of a single coin.",
              icon: Scale,
            },
            {
              title: "Already in Your Wallet",
              desc: "You don't need to buy or mine Jabos separately. If you own any BRICS, you already own Jabos. It's just a different way to read the same balance.",
              icon: Wallet,
            },
            {
              title: "Human-Friendly Numbers",
              desc: "Instead of saying '0.00003500 BRICS', you can say '3,500 JBS'. Cleaner, simpler, and easier to understand at a glance.",
              icon: Zap,
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full border-white/[0.06] bg-white/[0.02]">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: `${JBS_COLOR}10`, border: `1px solid ${JBS_COLOR}20` }}>
                    <item.icon className="w-5 h-5" style={{ color: JBS_COLOR }} />
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The Story */}
      <section>
        <SectionTitle icon={History} title="The Story Behind the Name" subtitle="A tribute to the creator" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="border-white/[0.06] bg-white/[0.02]">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center"
                  style={{ background: `${JBS_COLOR}15`, border: `1px solid ${JBS_COLOR}25` }}>
                  <span className="text-2xl font-black" style={{ color: JBS_COLOR }}>J</span>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    In the Bitcoin world, the smallest unit is called a <strong className="text-foreground">Satoshi</strong>,
                    named after Satoshi Nakamoto, the pseudonymous creator of Bitcoin. It's a permanent tribute embedded
                    in the protocol itself.
                  </p>
                  <p>
                    BricsCoin follows the same tradition. The <strong style={{ color: JBS_COLOR }}>Jabos</strong> is named
                    after <strong className="text-foreground">Jabo86</strong>, the developer and visionary behind BricsCoin.
                    The name carries the spirit of the project: built by one person, for the entire community.
                  </p>
                  <p>
                    Every time someone sends 1 Jabos, they're using a unit that honors the origin of the network —
                    a reminder that every great blockchain started with a single block and a single builder.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Conversion Table */}
      <section>
        <SectionTitle icon={Calculator} title="Conversion Table" subtitle="BRICS to Jabos at a glance" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="jbs-conversion-table">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-sm font-bold" style={{ color: JBS_COLOR }}>BRICS</th>
                    <th className="text-center px-4 py-4 text-sm text-muted-foreground">=</th>
                    <th className="text-right px-6 py-4 text-sm font-bold" style={{ color: JBS_COLOR }}>JABOS (JBS)</th>
                  </tr>
                </thead>
                <tbody>
                  {conversionTable.map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-sm font-mono">{row.brics} BRICS</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">=</td>
                      <td className="px-6 py-3 text-sm font-mono text-right" style={{ color: JBS_COLOR }}>{row.jbs} JBS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Comparison with Satoshi */}
      <section>
        <SectionTitle icon={Scale} title="Jabos vs Satoshi" subtitle="Side-by-side comparison" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="jbs-comparison-table">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-sm font-bold text-muted-foreground">Feature</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-orange-400">Bitcoin</th>
                    <th className="text-center px-6 py-4 text-sm font-bold" style={{ color: JBS_COLOR }}>BricsCoin</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-sm text-muted-foreground">{row.feature}</td>
                      <td className="px-6 py-3 text-sm text-center font-mono">{row.btc}</td>
                      <td className="px-6 py-3 text-sm text-center font-mono" style={{ color: JBS_COLOR }}>{row.brics}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Why it Exists */}
      <section>
        <SectionTitle icon={Zap} title="Why Jabos Exists" subtitle="Practical benefits of a sub-unit" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: "Micro-transactions",
              desc: "Send tiny amounts without dealing with long decimal numbers. 500 JBS is much clearer than 0.00000500 BRICS.",
            },
            {
              title: "Mining Fees",
              desc: "Transaction fees are naturally small. Expressing them in Jabos makes costs instantly readable.",
            },
            {
              title: "Future-proof",
              desc: "As BricsCoin grows in value, the Jabos becomes essential for everyday transactions and pricing.",
            },
            {
              title: "Universal Standard",
              desc: "Like cents for dollars or satoshis for bitcoin, Jabos gives BricsCoin a complete monetary system.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: JBS_COLOR }} />
                <div>
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Where to See It */}
      <section>
        <SectionTitle icon={Wallet} title="Where to Use Jabos" subtitle="Already live in your wallet" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link to="/wallet" className="block">
              <Card className="h-full border-white/[0.06] bg-white/[0.02] hover:border-white/20 transition-all group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    <Wallet className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Desktop Wallet</h3>
                    <p className="text-xs text-muted-foreground">Select JBS in the currency ticker to see your balance in Jabos</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/mobile-wallet" className="block">
              <Card className="h-full border-white/[0.06] bg-white/[0.02] hover:border-white/20 transition-all group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shrink-0">
                    <Smartphone className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Mobile Wallet</h3>
                    <p className="text-xs text-muted-foreground">Open your PQC wallet and tap the JBS selector for mobile view</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center py-8"
      >
        <p className="text-2xl font-heading font-bold mb-2">
          <span style={{ color: JBS_COLOR }}>100,000,000</span> Jabos = 1 BRICS
        </p>
        <p className="text-muted-foreground text-sm mb-6">Start using Jabos today in your wallet.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/wallet">
            <Button className="h-11 px-6" style={{ background: JBS_COLOR, color: "#000" }} data-testid="jabos-cta-wallet">
              <Wallet className="w-4 h-4 mr-2" /> Open Wallet
            </Button>
          </Link>
          <Link to="/mobile-wallet">
            <Button variant="outline" className="h-11 px-6 border-white/10" data-testid="jabos-cta-mobile">
              <Smartphone className="w-4 h-4 mr-2" /> Mobile Wallet
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
