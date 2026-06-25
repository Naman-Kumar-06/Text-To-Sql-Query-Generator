import { Layout } from "@/components/layout";
import { useListHistory, useDeleteHistoryEntry, getListHistoryQueryKey } from "@workspace/api-client-react";
import { DataTable } from "@/components/data-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquareCode, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

export function History() {
  const { data: history, isLoading } = useListHistory({ query: { queryKey: ["listHistory"] } });
  const deleteMutation = useDeleteHistoryEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ historyId: id });
      toast({ title: "Query deleted from history" });
      queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() });
    } catch (e) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const columns = [
    {
      accessorKey: "question",
      header: "Question",
      cell: (info: any) => (
        <div className="font-medium max-w-md truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      )
    },
    {
      accessorKey: "datasetName",
      header: "Source",
      cell: (info: any) => (
        <div className="text-muted-foreground">
          {info.getValue() || <span className="italic opacity-50">Unknown</span>}
        </div>
      )
    },
    {
      accessorKey: "rowCount",
      header: "Rows",
      cell: (info: any) => info.getValue() ?? '-'
    },
    {
      accessorKey: "executionTimeMs",
      header: "Time",
      cell: (info: any) => info.getValue() ? `${info.getValue()}ms` : '-'
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: (info: any) => format(new Date(info.getValue()), "MMM d, yyyy h:mm a")
    },
    {
      id: "actions",
      header: "",
      cell: (info: any) => {
        const row = info.row.original;
        return (
          <div className="flex justify-end gap-2">
            <Link href={`/chat?historyId=${row.id}`}>
              <Button variant="ghost" size="icon" title="Open in Chat">
                <MessageSquareCode className="h-4 w-4 text-primary" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
              <Trash2 className="h-4 w-4 text-destructive opacity-50 hover:opacity-100" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Query History</h1>
            <p className="text-muted-foreground mt-1">Review and rerun your previous queries.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-1 shadow-sm">
            {isLoading ? (
              <div className="p-8 space-y-4">
                <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-10 bg-muted/50 rounded w-full animate-pulse"></div>
                <div className="h-10 bg-muted/50 rounded w-full animate-pulse"></div>
              </div>
            ) : history?.length ? (
              <DataTable columns={columns} data={history} />
            ) : (
              <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
                <Clock className="h-10 w-10 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-1">No History Yet</h3>
                <p className="text-sm max-w-sm">Queries you run in the AI Chat will appear here for easy reference.</p>
                <Link href="/chat">
                  <Button className="mt-6">Start a Query</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
