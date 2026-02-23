import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Brain,
  Send,
  Activity,
  TrendingUp,
  ShieldCheck,
  Blocks,
  Zap,
  RefreshCw,
  MessageCircle,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  getOracleAnalysis,
  askOracle,
  getOracleHistory,
  getOraclePredictions
} from "../lib/api";

function HealthGauge({ score, status }) {
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400";
  const bgColor = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : score >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="text-center" data-testid="health-gauge">
      <div className="relative w-32 h-32 mx-auto mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
          <circle
            cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8"
            className={color}
            strokeDasharray={`${(score / 100) * 314} 314`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-heading font-bold ${color}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <Badge variant="outline" className={`${color} border-current`}>{status}</Badge>
    </div>
  );
}

function formatHashrate(h) {
  if (!h || h === 0) return "0 H/s";
  if (h >= 1e18) return `${(h / 1e18).toFixed(2)} EH/s`;
  if (h >= 1e15) return `${(h / 1e15).toFixed(2)} PH/s`;
  if (h >= 1e12) return `${(h / 1e12).toFixed(2)} TH/s`;
  if (h >= 1e9) return `${(h / 1e9).toFixed(2)} GH/s`;
  if (h >= 1e6) return `${(h / 1e6).toFixed(2)} MH/s`;
  if (h >= 1e3) return `${(h / 1e3).toFixed(2)} KH/s`;
  return `${h.toFixed(2)} H/s`;
}

export default function AiOracle() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "analysis";
  const [analysis, setAnalysis] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [asking, setAsking] = useState(false);
  const [sessionId] = useState(() => `oracle-${Date.now()}`);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await getOracleAnalysis();
      setAnalysis(res.data);
    } catch (err) {
      toast.error("Failed to get AI analysis. The Oracle may need a moment.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const fetchPredictions = async () => {
    setLoadingPredictions(true);
    try {
      const res = await getOraclePredictions();
      setPredictions(res.data);
    } catch (err) {
      toast.error("Failed to get predictions");
    } finally {
      setLoadingPredictions(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await getOracleHistory(20);
      setChatHistory((res.data.history || []).reverse());
    } catch { /* empty */ }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setChatHistory(prev => [...prev, { question: q, answer: null, timestamp: new Date().toISOString() }]);
    setAsking(true);

    try {
      const res = await askOracle(q, sessionId);
      setChatHistory(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.answer === null) {
          last.answer = res.data.answer;
        }
        return updated;
      });
    } catch (err) {
      setChatHistory(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.answer === null) {
          last.answer = "Sorry, I encountered an error. Please try again.";
        }
        return updated;
      });
    } finally {
      setAsking(false);
    }
  };

  const a = analysis?.analysis || {};
  const nd = analysis?.network_data || {};

  return (
    <div className="space-y-8" data-testid="ai-oracle-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">AI Oracle</h1>
        </div>
        <p className="text-muted-foreground">
          GPT-5.2 Powered Network Intelligence — Real-time blockchain analysis and predictions
        </p>
      </motion.div>

      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="bg-card border border-white/10">
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            <Activity className="w-4 h-4 mr-2" />Analysis
          </TabsTrigger>
          <TabsTrigger value="predictions" data-testid="tab-predictions">
            <TrendingUp className="w-4 h-4 mr-2" />Predictions
          </TabsTrigger>
          <TabsTrigger value="ask" data-testid="tab-ask">
            <MessageCircle className="w-4 h-4 mr-2" />Ask Oracle
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchAnalysis} disabled={loadingAnalysis} data-testid="refresh-analysis-btn">
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingAnalysis ? "animate-spin" : ""}`} />
              {loadingAnalysis ? "Analyzing..." : "Refresh Analysis"}
            </Button>
          </div>

          {loadingAnalysis && !analysis ? (
            <Card className="bg-card border-white/10">
              <CardContent className="p-12 text-center space-y-4">
                <Brain className="w-12 h-12 text-primary mx-auto animate-pulse" />
                <p className="text-muted-foreground">The AI Oracle is analyzing the blockchain...</p>
                <p className="text-xs text-muted-foreground">Powered by GPT-5.2</p>
              </CardContent>
            </Card>
          ) : analysis ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Health Score */}
                <Card className="bg-card border-white/10">
                  <CardContent className="p-6">
                    <HealthGauge score={a.health_score || 0} status={a.health_status || "Unknown"} />
                  </CardContent>
                </Card>

                {/* Network Data */}
                <Card className="bg-card border-white/10 md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Network Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Blocks</p>
                        <p className="font-bold">{nd.total_blocks?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Transactions</p>
                        <p className="font-bold">{nd.total_transactions?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hashrate</p>
                        <p className="font-bold">{formatHashrate(nd.hashrate_estimated_h_s)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Block Time</p>
                        <p className="font-bold">{nd.avg_block_time_seconds}s</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Difficulty</p>
                        <p className="font-bold">{nd.current_difficulty?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">PQC Wallets</p>
                        <p className="font-bold">{nd.pqc_wallets_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Block Reward</p>
                        <p className="font-bold">{nd.current_block_reward} BRICS</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Next Halving</p>
                        <p className="font-bold">Block #{nd.next_halving_block?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Halving ETA</p>
                        <p className="font-bold">{nd.estimated_halving_days?.toLocaleString()} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Summary */}
              {a.network_summary && (
                <Card className="bg-card border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      AI Network Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>{a.network_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Analysis Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {a.mining_analysis && (
                  <Card className="bg-card border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" /> Mining Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>{a.mining_analysis}</p>
                    </CardContent>
                  </Card>
                )}
                {a.security_analysis && (
                  <Card className="bg-card border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-400" /> Security Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>{a.security_analysis}</p>
                    </CardContent>
                  </Card>
                )}
                {a.halving_prediction && (
                  <Card className="bg-card border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" /> Halving Prediction
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>{a.halving_prediction}</p>
                    </CardContent>
                  </Card>
                )}
                {a.fun_fact && (
                  <Card className="bg-card border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" /> Fun Fact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>{a.fun_fact}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recommendations */}
              {a.recommendations && a.recommendations.length > 0 && (
                <Card className="bg-card border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" /> Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {a.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground text-right">
                Generated: {analysis.generated_at ? new Date(analysis.generated_at).toLocaleString() : "N/A"} | Model: {analysis.model}
              </p>
            </>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Click "Refresh Analysis" to get AI insights</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchPredictions} disabled={loadingPredictions} data-testid="refresh-predictions-btn">
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingPredictions ? "animate-spin" : ""}`} />
              {loadingPredictions ? "Predicting..." : "Generate Predictions"}
            </Button>
          </div>

          {loadingPredictions && !predictions ? (
            <Card className="bg-card border-white/10">
              <CardContent className="p-12 text-center space-y-4">
                <TrendingUp className="w-12 h-12 text-primary mx-auto animate-pulse" />
                <p className="text-muted-foreground">Generating AI predictions...</p>
              </CardContent>
            </Card>
          ) : predictions ? (
            <div className="space-y-6">
              {predictions.predictions && (
                <>
                  {/* Outlook */}
                  {predictions.predictions.overall_outlook && (
                    <Card className="bg-card border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <TrendingUp className="w-6 h-6 text-primary" />
                          <h3 className="font-heading font-bold">Overall Outlook</h3>
                          {(() => {
                            const outlook = typeof predictions.predictions.overall_outlook === "object"
                              ? predictions.predictions.overall_outlook.outlook
                              : predictions.predictions.overall_outlook;
                            return (
                              <Badge variant="outline" className={
                                outlook === "bullish" ? "border-green-500/50 text-green-400" :
                                outlook === "bearish" ? "border-red-500/50 text-red-400" :
                                "border-yellow-500/50 text-yellow-400"
                              }>
                                {outlook}
                              </Badge>
                            );
                          })()}
                        </div>
                        {(() => {
                          const reasoning = typeof predictions.predictions.overall_outlook === "object"
                            ? predictions.predictions.overall_outlook.reasoning
                            : predictions.predictions.reasoning;
                          return reasoning ? <p className="text-sm text-muted-foreground">{reasoning}</p> : null;
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {predictions.predictions.difficulty_trend && (
                      <Card className="bg-card border-white/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Difficulty Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {(() => {
                            const dt = predictions.predictions.difficulty_trend;
                            const trend = typeof dt === "object" ? dt.trend : dt;
                            const confidence = typeof dt === "object" ? dt.confidence : predictions.predictions.confidence;
                            return (
                              <>
                                <Badge variant="outline" className="mb-2">{trend}</Badge>
                                {confidence && (
                                  <div className="mt-2">
                                    <p className="text-xs mb-1">Confidence: {confidence}%</p>
                                    <Progress value={confidence} className="h-1.5" />
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}
                    {predictions.predictions.hashrate_forecast && (
                      <Card className="bg-card border-white/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Hashrate Forecast</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          <p>{predictions.predictions.hashrate_forecast}</p>
                        </CardContent>
                      </Card>
                    )}
                    {predictions.predictions.next_halving_impact && (
                      <Card className="bg-card border-white/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Halving Impact</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          <p>{predictions.predictions.next_halving_impact}</p>
                        </CardContent>
                      </Card>
                    )}
                    {predictions.predictions.network_growth && (
                      <Card className="bg-card border-white/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Network Growth</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          <p>{predictions.predictions.network_growth}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {predictions.predictions.risk_factors && predictions.predictions.risk_factors.length > 0 && (
                    <Card className="bg-card border-white/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-400" /> Risk Factors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {predictions.predictions.risk_factors.map((r, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <AlertTriangle className="w-3 h-3 text-orange-400 mt-1 flex-shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {predictions.predictions.opportunities && predictions.predictions.opportunities.length > 0 && (
                    <Card className="bg-card border-white/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" /> Opportunities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {predictions.predictions.opportunities.map((o, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                              {o}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              <p className="text-xs text-muted-foreground text-right">
                Generated: {predictions.generated_at ? new Date(predictions.generated_at).toLocaleString() : "N/A"} | Model: {predictions.model}
              </p>
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Click "Generate Predictions" to get AI-powered forecasts</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ask Oracle Tab */}
        <TabsContent value="ask" className="space-y-6">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Ask the Oracle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chat History */}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2" data-testid="oracle-chat-container">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Ask the AI Oracle anything about BricsCoin</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {["What's the network health?", "When is the next halving?", "How is PQC adoption going?", "What's the hashrate trend?"].map(q => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => { setQuestion(q); }}
                          data-testid={`suggestion-${q.slice(0, 10)}`}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatHistory.map((item, i) => (
                    <div key={i} className="space-y-2">
                      {/* User question */}
                      <div className="flex justify-end">
                        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 max-w-[80%]">
                          <p className="text-sm">{item.question}</p>
                        </div>
                      </div>
                      {/* Oracle answer */}
                      <div className="flex justify-start">
                        <div className="bg-card border border-white/10 rounded-lg px-4 py-2 max-w-[80%]">
                          {item.answer === null ? (
                            <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.answer}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 border-t border-white/10 pt-4">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about hashrate, halving, PQC security..."
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  disabled={asking}
                  data-testid="oracle-question-input"
                />
                <Button className="gold-button" onClick={handleAsk} disabled={asking} data-testid="oracle-ask-btn">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Powered by GPT-5.2 — Answers are AI-generated and may not be perfectly accurate
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
