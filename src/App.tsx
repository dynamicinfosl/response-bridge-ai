import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, Component, ReactNode } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Atendimentos from "./pages/Atendimentos";
import Colaboradores from "./pages/Colaboradores";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesAvancadas from "./pages/ConfiguracoesAvancadas";
import LigacoesIA from "./pages/LigacoesIA";
import OrdemServico from "./pages/OrdemServico";
import Relatorios from "./pages/Relatorios";
import ConfiguracaoIA from "./pages/ConfiguracaoIA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loading component
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

// Custom Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-destructive">Algo deu errado</h1>
            <p className="text-muted-foreground mb-4">Ocorreu um erro inesperado. Tente recarregar a página.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/atendimentos" element={<Atendimentos />} />
              <Route path="/colaboradores" element={<Colaboradores />} />
              <Route path="/ligacoes-ia" element={<LigacoesIA />} />
              <Route path="/ordem-servico" element={<OrdemServico />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracao-ia" element={<ConfiguracaoIA />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/configuracoes-avancadas" element={<ConfiguracoesAvancadas />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
