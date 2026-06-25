import { Layout } from "@/components/layout";
import { useGetStats, useListHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Database, MessageSquare, Upload, Activity, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function Home() {
  const { data: stats, isLoading: isLoadingStats } = useGetStats();
  const { data: history, isLoading: isLoadingHistory } = useListHistory({ query: { queryKey: ["listHistory"] } });

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of your data operations and queries.</p>
            </div>
            <Link href="/chat">
              <Button size="lg" className="shadow-lg">Start Querying</Button>
            </Link>
          </div>

          {isLoadingStats ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Datasets</CardTitle>
                  <Upload className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.totalDatasets || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Queries Run</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.totalQueries || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Connections</CardTitle>
                  <Database className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.totalConnections || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
                  <MessageSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.totalConversations || 0}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent Queries</h2>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <Card className="border-border/50 shadow-sm overflow-hidden">
              {isLoadingHistory ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {history.slice(0, 5).map((entry) => (
                    <Link key={entry.id} href={`/chat?historyId=${entry.id}`}>
                      <div className="p-4 hover:bg-accent/50 transition-colors flex items-start gap-4 group cursor-pointer">
                        <div className="mt-1 bg-primary/10 p-2 rounded-md text-primary">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{entry.question}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(entry.createdAt), "MMM d, h:mm a")}</span>
                            {entry.datasetName && (
                              <>
                                <span>&bull;</span>
                                <span>{entry.datasetName}</span>
                              </>
                            )}
                            {entry.executionTimeMs && (
                              <>
                                <span>&bull;</span>
                                <span>{entry.executionTimeMs}ms</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p>No queries yet.</p>
                  <p className="text-sm mt-1">Start by asking your first question.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
