import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Upload, MessageSquare, History, Database, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/history", label: "History", icon: History },
    { href: "/connections", label: "Connections", icon: Database },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">DataCraft AI</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 space-y-3">
          {user && (
            <div className="flex items-center gap-3 min-w-0">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName ?? "User"}
                  className="h-8 w-8 rounded-full flex-shrink-0 object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {(user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "?")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {user.fullName ?? "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
