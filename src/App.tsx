import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
