import { Layout } from "@/components/layout";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Send, Database, Upload, AlertTriangle, 
  Download, Lightbulb, MessageSquareCode 
} from "lucide-react";
import { 
  useListDatasets, 
  useListConnections, 
  useGenerateQuery, 
  useExecuteQuery, 
  useValidateQuery,
  useCreateConversation,
  useGenerateInsights,
  useExportCsv
} from "@workspace/api-client-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { DataTable } from "@/components/data-table";
import Plot from 'react-plotly.js';

type Source = { type: 'dataset' | 'connection', id: string };

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  explanation?: string;
  results?: {
    columns: string[];
    rows: any[];
    chartType?: string | null;
    chartConfig?: any;
    error?: string;
  };
  insights?: any;
};

export function Chat() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialHistoryId = searchParams.get('historyId');

  const { data: datasets } = useListDatasets();
  const { data: connections } = useListConnections();
  const { toast } = useToast();
  
  const [source, setSource] = useState<Source | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const createConv = useCreateConversation();
  const generateQuery = useGenerateQuery();
  const validateQuery = useValidateQuery();
  const executeQuery = useExecuteQuery();
  const generateInsights = useGenerateInsights();
  const exportCsv = useExportCsv();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleExport = async (msg: Message) => {
    if (!msg.results) return;
    try {
      const res = await exportCsv.mutateAsync({
        data: {
          columns: msg.results.columns,
          rows: msg.results.rows,
          fileName: "export.csv"
        }
      });
      window.open(res.downloadUrl, '_blank');
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !source) return;

    const question = input.trim();
    setInput("");
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      let currentConvId = conversationId;
      if (!currentConvId) {
        const conv = await createConv.mutateAsync({
          data: {
            title: question.substring(0, 50),
            datasetId: source.type === 'dataset' ? source.id : undefined,
          }
        });
        currentConvId = conv.id;
        setConversationId(currentConvId);
      }

      const genRes = await generateQuery.mutateAsync({
        data: {
          question,
          datasetId: source.type === 'dataset' ? source.id : undefined,
          connectionId: source.type === 'connection' ? source.id : undefined,
          conversationId: currentConvId
        }
      });

      const valRes = await validateQuery.mutateAsync({
        data: {
          sql: genRes.sql,
          datasetId: source.type === 'dataset' ? source.id : undefined,
        }
      });

      if (!valRes.isValid) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I generated a query, but it failed validation.",
          sql: genRes.sql,
          explanation: genRes.explanation,
          results: { columns: [], rows: [], error: valRes.errors.join("\n") }
        }]);
        setIsProcessing(false);
        return;
      }

      try {
        const execRes = await executeQuery.mutateAsync({
          data: {
            sql: genRes.sql,
            datasetId: source.type === 'dataset' ? source.id : undefined,
            connectionId: source.type === 'connection' ? source.id : undefined,
            historyId: genRes.historyId
          }
        });

        // Fire and forget insights
        generateInsights.mutateAsync({
          data: {
            question,
            sql: genRes.sql,
            columns: execRes.columns,
            rows: execRes.rows.slice(0, 50),
            datasetName: source.type === 'dataset' ? datasets?.find(d => d.id === source.id)?.name : undefined
          }
        }).then(insightsRes => {
           setMessages(prev => prev.map(m => m.sql === genRes.sql ? { ...m, insights: insightsRes } : m));
        }).catch(e => console.error("Insights failed", e));

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Here are the results for your query.",
          sql: genRes.sql,
          explanation: genRes.explanation,
          results: {
            columns: execRes.columns,
            rows: execRes.rows,
            chartType: execRes.chartType,
            chartConfig: execRes.chartConfig
          }
        }]);

      } catch (execErr: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "The query failed to execute.",
          sql: genRes.sql,
          explanation: genRes.explanation,
          results: { columns: [], rows: [], error: execErr.message || "Execution error" }
        }]);
      }

    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to process query", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-border/50 bg-card/30 flex flex-col p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Data Source</h2>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-2 block">Datasets</div>
              <div className="space-y-1">
                {datasets?.map(d => (
                  <Button 
                    key={d.id} 
                    variant={source?.type === 'dataset' && source.id === d.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => setSource({ type: 'dataset', id: d.id })}
                  >
                    <Upload className="h-4 w-4 mr-2 opacity-70" />
                    <span className="truncate">{d.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2 block mt-4">Connections</div>
              <div className="space-y-1">
                {connections?.map(c => (
                  <Button 
                    key={c.id} 
                    variant={source?.type === 'connection' && source.id === c.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => setSource({ type: 'connection', id: c.id })}
                  >
                    <Database className="h-4 w-4 mr-2 opacity-70" />
                    <span className="truncate">{c.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background relative">
          {!source ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <div className="text-center p-8 bg-card border border-border/50 rounded-xl shadow-lg max-w-md">
                <Database className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Select a Data Source</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a dataset or database connection from the left panel to start querying.
                </p>
              </div>
            </div>
          ) : null}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 && source && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                <MessageSquareCode className="h-12 w-12 text-primary" />
                <div>
                  <h3 className="text-xl font-medium text-foreground">What would you like to know?</h3>
                  <p className="text-sm mt-1">Ask questions in plain English. I'll write the SQL and visualize the results.</p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl p-4' : 'w-full space-y-4'}`}>
                  
                  {msg.role === 'user' ? (
                    <div className="text-sm">{msg.content}</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-4 min-w-0">
                          {msg.sql && (
                            <div className="rounded-md overflow-hidden border border-border/50">
                              <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground flex justify-between items-center">
                                <span>Generated SQL</span>
                              </div>
                              <SyntaxHighlighter 
                                language="sql" 
                                style={vscDarkPlus}
                                customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.875rem' }}
                              >
                                {msg.sql}
                              </SyntaxHighlighter>
                            </div>
                          )}

                          {msg.explanation && (
                            <div className="text-sm text-foreground bg-accent/30 p-3 rounded-md border border-accent">
                              {msg.explanation}
                            </div>
                          )}

                          {msg.insights && (
                            <div className="text-sm text-foreground bg-emerald-500/10 p-3 rounded-md border border-emerald-500/20">
                              <div className="flex items-center gap-2 mb-2 font-medium text-emerald-600 dark:text-emerald-400">
                                <Lightbulb className="h-4 w-4" /> AI Insights
                              </div>
                              <p className="mb-2">{msg.insights.summary}</p>
                              <ul className="list-disc pl-5 space-y-1">
                                {msg.insights.insights.map((ins: any, idx: number) => (
                                  <li key={idx}><strong>{ins.title}:</strong> {ins.description}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.results?.error && (
                            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 flex gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <pre className="whitespace-pre-wrap font-mono text-xs">{msg.results.error}</pre>
                            </div>
                          )}

                          {msg.results && msg.results.columns.length > 0 && (
                            <div className="space-y-4">
                              {msg.results.chartType && msg.results.chartConfig && (
                                <Card className="p-4 border-border/50 bg-card overflow-hidden">
                                  <Plot
                                    data={(msg.results.chartConfig as any).data}
                                    layout={{ 
                                      ...(msg.results.chartConfig as any).layout,
                                      paper_bgcolor: 'transparent',
                                      plot_bgcolor: 'transparent',
                                      font: { color: 'hsl(var(--foreground))' },
                                      margin: { t: 30, r: 10, l: 40, b: 40 },
                                      autosize: true
                                    }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '300px' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                  />
                                </Card>
                              )}

                              <div className="bg-card border border-border/50 rounded-lg overflow-hidden relative">
                                <div className="absolute top-2 right-2 z-10">
                                  <Button size="sm" variant="secondary" onClick={() => handleExport(msg)}>
                                    <Download className="h-3 w-3 mr-1" /> CSV
                                  </Button>
                                </div>
                                <DataTable
                                  columns={msg.results.columns.map(c => ({
                                    accessorKey: c,
                                    header: c,
                                    cell: (info) => {
                                      const val = info.getValue();
                                      if (val === null) return <span className="opacity-50">null</span>;
                                      return String(val);
                                    }
                                  }))}
                                  data={msg.results.rows}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 text-muted-foreground text-sm p-4 bg-accent/20 rounded-2xl rounded-tl-sm w-fit border border-accent">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Analyzing data & generating SQL...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-background border-t border-border/50">
            <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={source ? "Ask a question about your data..." : "Select a source first..."}
                disabled={!source || isProcessing}
                className="pr-12 py-6 text-base bg-card border-border/50 shadow-sm rounded-xl focus-visible:ring-primary/20"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || !source || isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
