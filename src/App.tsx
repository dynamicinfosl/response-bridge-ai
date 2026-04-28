import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, Component, ReactNode } from "react";
import { AuthProvider } from "./contexts/AuthContext";
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
import TesteN8N from "./pages/TesteN8N";
import Clientes from "./pages/Clientes";
import DisparosTemplates from "./pages/DisparosTemplates";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import RouterAccess from "./pages/RouterAccess";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";

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
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/atendimentos" element={<ProtectedRoute><Atendimentos /></ProtectedRoute>} />
                <Route path="/colaboradores" element={<ProtectedRoute><Colaboradores /></ProtectedRoute>} />
                <Route path="/ligacoes-ia" element={<ProtectedRoute><LigacoesIA /></ProtectedRoute>} />
                <Route path="/ordem-servico" element={<ProtectedRoute><OrdemServico /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                <Route path="/disparos-templates" element={<ProtectedRoute><DisparosTemplates /></ProtectedRoute>} />
                <Route path="/configuracao-ia" element={<ProtectedRoute><ConfiguracaoIA /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/configuracoes-avancadas" element={<RoleProtectedRoute allowedRoles={['master']}><ConfiguracoesAvancadas /></RoleProtectedRoute>} />
                <Route path="/teste-n8n" element={<ProtectedRoute><TesteN8N /></ProtectedRoute>} />
                <Route path="/router-access" element={<RoleProtectedRoute allowedRoles={['master']}><RouterAccess /></RoleProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
