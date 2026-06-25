import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/home";
import { Settings } from "@/pages/settings";
import { UploadPage } from "@/pages/upload";
import { Connections } from "@/pages/connections";
import { History } from "@/pages/history";
import { Chat } from "@/pages/chat";
import { Database, Zap, BarChart2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(188, 86%, 53%)",
    colorForeground: "hsl(210, 40%, 98%)",
    colorMutedForeground: "hsl(215, 20.2%, 65.1%)",
    colorDanger: "#ef4444",
    colorBackground: "hsl(222, 47%, 11%)",
    colorInput: "hsl(216, 34%, 17%)",
    colorInputForeground: "hsl(210, 40%, 98%)",
    colorNeutral: "hsl(216, 34%, 22%)",
    fontFamily: "Inter, ui-sans-serif, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(222,47%,13%)] border border-[hsl(216,34%,22%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(210,40%,98%)] font-bold",
    headerSubtitle: "text-[hsl(215,20.2%,65.1%)]",
    socialButtonsBlockButtonText: "text-[hsl(210,40%,98%)]",
    formFieldLabel: "text-[hsl(210,40%,98%)]",
    footerActionLink: "text-[hsl(188,86%,53%)]",
    footerActionText: "text-[hsl(215,20.2%,65.1%)]",
    dividerText: "text-[hsl(215,20.2%,65.1%)]",
    identityPreviewEditButton: "text-[hsl(188,86%,53%)]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-[hsl(210,40%,98%)]",
    logoBox: "mb-2",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton:
      "border border-[hsl(216,34%,22%)] bg-[hsl(216,34%,17%)]",
    formButtonPrimary:
      "bg-[hsl(188,86%,53%)] text-[hsl(222,47%,11%)] font-semibold hover:bg-[hsl(188,86%,45%)]",
    formFieldInput:
      "bg-[hsl(216,34%,17%)] border-[hsl(216,34%,22%)] text-[hsl(210,40%,98%)]",
    footerAction: "border-t border-[hsl(216,34%,17%)] bg-transparent",
    dividerLine: "bg-[hsl(216,34%,22%)]",
    alert: "bg-[hsl(216,34%,17%)] border-[hsl(216,34%,22%)]",
    otpCodeFieldInput:
      "bg-[hsl(216,34%,17%)] border-[hsl(216,34%,22%)] text-[hsl(210,40%,98%)]",
    formFieldRow: "",
    main: "",
  },
};

function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">DataCraft AI</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setLocation("/sign-in")}>
            Sign In
          </Button>
          <Button onClick={() => setLocation("/sign-up")}>Get Started</Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 py-20">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-2 border border-primary/20">
          <Zap className="h-3.5 w-3.5" />
          AI-powered SQL generation
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          Talk to your data in{" "}
          <span className="text-primary">plain English</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Upload CSV or XLSX files, ask questions naturally, and get instant SQL
          queries, visualizations, and AI insights — no SQL knowledge required.
        </p>
        <div className="flex gap-4 mt-2">
          <Button
            size="lg"
            onClick={() => setLocation("/sign-up")}
            className="gap-2"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setLocation("/sign-in")}
          >
            Sign in
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-3xl w-full text-left">
          {[
            {
              icon: Database,
              title: "Upload Any Data",
              desc: "Drag & drop CSV or XLSX files. DuckDB processes them instantly in-memory.",
            },
            {
              icon: Zap,
              title: "AI SQL Generation",
              desc: "Describe what you want in plain English. AI writes and executes the SQL for you.",
            },
            {
              icon: BarChart2,
              title: "Auto Visualizations",
              desc: "Results render as interactive charts with AI-generated business insights.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-xl p-5 space-y-3"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
        © 2026 DataCraft AI. All rights reserved.
      </footer>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route
        path="/dashboard"
        component={() => <ProtectedRoute component={Home} />}
      />
      <Route
        path="/upload"
        component={() => <ProtectedRoute component={UploadPage} />}
      />
      <Route
        path="/chat"
        component={() => <ProtectedRoute component={Chat} />}
      />
      <Route
        path="/history"
        component={() => <ProtectedRoute component={History} />}
      />
      <Route
        path="/connections"
        component={() => <ProtectedRoute component={Connections} />}
      />
      <Route
        path="/settings"
        component={() => <ProtectedRoute component={Settings} />}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your DataCraft AI account",
          },
        },
        signUp: {
          start: {
            title: "Create account",
            subtitle: "Get started with DataCraft AI for free",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    if (!localStorage.getItem("theme")) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
