import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useAtualizacoes } from '@/hooks/useAtualizacoes';
import { useFeedbacks } from '@/hooks/useFeedbacks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Megaphone, MessageSquare } from 'lucide-react';
import { AtualizacoesList } from '@/components/atualizacoes/AtualizacoesList';
import { FeedbacksList } from '@/components/atualizacoes/FeedbacksList';
import { NovaAtualizacaoDialog } from '@/components/atualizacoes/NovaAtualizacaoDialog';
import { NovoFeedbackDialog } from '@/components/atualizacoes/NovoFeedbackDialog';
import { isAdmin } from '@/components/atualizacoes/helpers';

const Atualizacoes = () => {
  const { user } = useAuth();
  const admin = isAdmin(user?.role);
  const [activeTab, setActiveTab] = useState('atualizacoes');
  const { data: atualizacoes = [], isLoading: loadingAtualizacoes } = useAtualizacoes();
  const { data: feedbacks = [], isLoading: loadingFeedbacks } = useFeedbacks();

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Atualizações & Feedback
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe as novidades do sistema e envie seus feedbacks
            </p>
          </div>
          <div className="flex gap-2">
            {admin && <NovaAtualizacaoDialog />}
            <NovoFeedbackDialog />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="atualizacoes" className="flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              Atualizações
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{atualizacoes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Feedbacks
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{feedbacks.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atualizacoes" className="mt-4">
            <AtualizacoesList atualizacoes={atualizacoes} isLoading={loadingAtualizacoes} />
          </TabsContent>

          <TabsContent value="feedbacks" className="mt-4">
            <FeedbacksList
              feedbacks={feedbacks}
              atualizacoes={atualizacoes}
              isLoading={loadingFeedbacks}
              userRole={user?.role}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Atualizacoes;
