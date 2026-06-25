import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { Database, Monitor, Moon, Sun, Key } from "lucide-react";

export function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage application preferences and AI providers.</p>
          </div>

          <div className="grid gap-8">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  <CardTitle>Appearance</CardTitle>
                </div>
                <CardDescription>Customize the look and feel of the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between dark and light themes. Dark mode is recommended for data analysis.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Switch 
                      checked={theme === 'dark' || document.documentElement.classList.contains('dark')} 
                      onCheckedChange={(checked) => {
                        if (checked) {
                          document.documentElement.classList.add('dark');
                          setTheme('dark');
                        } else {
                          document.documentElement.classList.remove('dark');
                          setTheme('light');
                        }
                      }} 
                    />
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <CardTitle>AI Providers</CardTitle>
                </div>
                <CardDescription>Status of connected AI inference providers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-card/50">
                  <div>
                    <h4 className="font-medium text-foreground">Groq</h4>
                    <p className="text-sm text-muted-foreground">Lightning fast inference</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    Connected
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-card/50">
                  <div>
                    <h4 className="font-medium text-foreground">OpenAI</h4>
                    <p className="text-sm text-muted-foreground">GPT-4o fallback</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    Connected
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
