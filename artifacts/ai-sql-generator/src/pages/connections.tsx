import { Layout } from "@/components/layout";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useListConnections, useCreateConnection, useTestConnection, useDeleteConnection } from "@workspace/api-client-react";
import { Database, Plus, Trash2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListConnectionsQueryKey } from "@workspace/api-client-react";

export function Connections() {
  const { data: connections, isLoading } = useListConnections();
  const createConnection = useCreateConnection();
  const testConnection = useTestConnection();
  const deleteConnection = useDeleteConnection();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dbType: "postgresql" as const,
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
  });

  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'success'|'error'>('idle');

  const handleTest = async () => {
    setTestStatus('testing');
    try {
      const res = await testConnection.mutateAsync({
        data: {
          ...formData,
          port: formData.port ? parseInt(formData.port) : undefined,
        }
      });
      if (res.success) {
        setTestStatus('success');
        toast({ title: "Connection successful", description: res.message });
      } else {
        setTestStatus('error');
        toast({ title: "Connection failed", description: res.message, variant: "destructive" });
      }
    } catch (e: any) {
      setTestStatus('error');
      toast({ title: "Connection failed", description: e.message || "Network error", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await createConnection.mutateAsync({
        data: {
          ...formData,
          port: formData.port ? parseInt(formData.port) : undefined,
        }
      });
      toast({ title: "Connection saved" });
      setIsAdding(false);
      setTestStatus('idle');
      queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConnection.mutateAsync({ connectionId: id });
      toast({ title: "Connection deleted" });
      queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Database Connections</h1>
              <p className="text-muted-foreground mt-1">Connect external databases for live querying.</p>
            </div>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Connection
              </Button>
            )}
          </div>

          {isAdding && (
            <Card className="border-primary/50 shadow-md">
              <CardHeader>
                <CardTitle>New Connection</CardTitle>
                <CardDescription>Enter your database credentials. They are stored securely.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Connection Name</Label>
                    <Input 
                      placeholder="Production DB" 
                      value={formData.name} 
                      onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Database Type</Label>
                    <Select value={formData.dbType} onValueChange={(v: any) => setFormData(p => ({...p, dbType: v}))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                        <SelectItem value="mysql">MySQL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-3">
                    <Label>Host</Label>
                    <Input 
                      placeholder="db.example.com" 
                      value={formData.host} 
                      onChange={e => setFormData(p => ({...p, host: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input 
                      placeholder="5432" 
                      value={formData.port} 
                      onChange={e => setFormData(p => ({...p, port: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Database Name</Label>
                  <Input 
                    placeholder="public" 
                    value={formData.database} 
                    onChange={e => setFormData(p => ({...p, database: e.target.value}))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                      placeholder="postgres" 
                      value={formData.username} 
                      onChange={e => setFormData(p => ({...p, username: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input 
                      type="password" 
                      value={formData.password} 
                      onChange={e => setFormData(p => ({...p, password: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    {testStatus === 'testing' && <><RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> Testing...</>}
                    {testStatus === 'success' && <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Connection successful</>}
                    {testStatus === 'error' && <><XCircle className="h-4 w-4 text-destructive" /> Connection failed</>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                    <Button variant="secondary" onClick={handleTest} disabled={testStatus === 'testing' || !formData.name}>Test</Button>
                    <Button onClick={handleSave} disabled={!formData.name || createConnection.isPending}>Save Connection</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {isLoading ? (
              [1,2].map(i => <Card key={i} className="h-32 animate-pulse bg-muted/50" />)
            ) : connections?.length === 0 ? (
              <div className="col-span-2 text-center p-12 border border-dashed rounded-xl border-border/50 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No connections configured.</p>
              </div>
            ) : (
              connections?.map(conn => (
                <Card key={conn.id} className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{conn.name}</CardTitle>
                        <CardDescription>{conn.dbType} &bull; {conn.host}:{conn.port}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive opacity-50 hover:opacity-100" onClick={() => handleDelete(conn.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${conn.isActive ? 'bg-emerald-500' : 'bg-muted'}`}></div>
                      {conn.isActive ? 'Active' : 'Inactive'}
                      <span className="mx-2">&bull;</span>
                      DB: {conn.database}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
