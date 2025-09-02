import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Bot, 
  User,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CloseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  ticketData: {
    startTime: string;
    totalMessages: number;
    aiMessages: number;
    humanMessages: number;
    channel: string;
  };
}

export const CloseTicketModal = ({ isOpen, onClose, clientName, ticketData }: CloseTicketModalProps) => {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Auto-generate summary based on ticket data
  const generateSummary = () => {
    setIsGenerating(true);
    
    // Mock AI summary generation
    setTimeout(() => {
      const autoSummary = `Atendimento iniciado às ${ticketData.startTime} via ${ticketData.channel}. 
Cliente ${clientName} teve sua solicitação resolvida com ${ticketData.totalMessages} mensagens trocadas. 
A IA respondeu ${ticketData.aiMessages} mensagens e o atendente humano ${ticketData.humanMessages}. 
Problema resolvido com sucesso e cliente demonstrou satisfação.`;
      
      setSummary(autoSummary);
      setIsGenerating(false);
    }, 2000);
  };

  const handleClose = () => {
    if (!summary.trim()) {
      toast({
        title: "Resumo obrigatório",
        description: "Por favor, adicione um resumo antes de encerrar o atendimento.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Atendimento encerrado!",
      description: `Conversa com ${clientName} foi finalizada com sucesso.`,
    });
    
    setSummary('');
    onClose();
  };

  const duration = new Date().getTime() - new Date(`2024-01-15 ${ticketData.startTime}`).getTime();
  const minutes = Math.floor(duration / (1000 * 60));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Encerrar Atendimento
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Finalizando conversa com <strong>{clientName}</strong>
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Ticket Stats */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-3">
            <h4 className="text-sm font-medium">Resumo do Atendimento:</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Duração: {minutes}min</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>Total: {ticketData.totalMessages} mensagens</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span>IA: {ticketData.aiMessages} respostas</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-success" />
                <span>Humano: {ticketData.humanMessages} respostas</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Canal: {ticketData.channel}
              </Badge>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <Star className="w-3 h-3 mr-1" />
                Resolvido
              </Badge>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Resumo do Atendimento:</label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateSummary}
                disabled={isGenerating}
              >
                {isGenerating ? "Gerando..." : "Gerar com IA"}
              </Button>
            </div>
            <Textarea
              placeholder="Descreva como o problema foi resolvido e principais pontos da conversa..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-24"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-primary-muted p-3 rounded-lg">
            <p className="text-sm text-primary font-medium mb-2">
              Ações Automáticas:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Cliente receberá pesquisa de satisfação por WhatsApp</li>
              <li>• Histórico será arquivado e indexado para consultas futuras</li>
              <li>• Webhook será disparado para sistemas externos</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleClose}
            className="bg-gradient-primary hover:shadow-primary"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Finalizar Atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};