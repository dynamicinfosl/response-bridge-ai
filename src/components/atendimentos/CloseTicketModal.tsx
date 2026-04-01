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
  Star,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCloseChat } from '@/hooks/useChats';
import { chatwootAPI } from '@/lib/chatwoot';

interface CloseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  chatId: string;
  ticketData: {
    startTime: string;
    totalMessages: number;
    aiMessages: number;
    humanMessages: number;
    channel: string;
  };
}

export const CloseTicketModal = ({ isOpen, onClose, clientName, chatId, ticketData }: CloseTicketModalProps) => {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { toast } = useToast();
  const closeChatMutation = useCloseChat();

// ...

  const handleClose = async () => {
    setIsClosing(true);
    try {
      // 1. Enviar o resumo como uma nota privada no Chatwoot (apenas se preenchido)
      if (summary.trim()) {
        await chatwootAPI.sendMessage(Number(chatId), `Resumo Manual:\n${summary}`, true);
      }

      // 2. Mudar status para resolvido
      await closeChatMutation.mutateAsync({ id: chatId });

      toast({
        title: "Atendimento encerrado!",
        description: `Conversa com ${clientName} foi finalizada com sucesso.`,
      });

      setSummary('');
      onClose();
    } catch (error) {
      console.error('Erro ao fechar atendimento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível encerrar o atendimento no sistema.",
        variant: "destructive"
      });
    } finally {
      setIsClosing(false);
    }
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
              <label className="text-sm font-medium">Resumo do Atendimento (Opcional):</label>
            </div>
            <Textarea
              placeholder="Opcional: Descreva como o problema foi resolvido. Deixe em branco para a IA gerar automaticamente pelo fluxo normal..."
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
            disabled={isClosing}
            className="bg-gradient-primary hover:shadow-primary text-white"
          >
            {isClosing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Finalizar Atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};