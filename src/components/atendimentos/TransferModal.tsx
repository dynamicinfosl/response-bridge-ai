import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  UserCheck,
  MessageSquare,
  Loader2,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatwootAPI, type ChatwootAgent } from '@/lib/chatwoot';
import { useTransferChat } from '@/hooks/useChats';
import { logAuditAction } from '@/lib/audit';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  chatId: string;
  currentAttendant?: string;
}

export const TransferModal = ({ isOpen, onClose, clientName, chatId, currentAttendant }: TransferModalProps) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [agents, setAgents] = useState<ChatwootAgent[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const transferMutation = useTransferChat();

  const sectors = [
    { id: 'comercial', name: 'Comercial', color: 'bg-blue-500' },
    { id: 'financeiro', name: 'Financeiro', color: 'bg-green-500' },
    { id: 'tecnico', name: 'Técnico', color: 'bg-orange-500' },
  ];

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      chatwootAPI.getAgents()
        .then(setAgents)
        .catch(err => {
          console.error('Erro ao buscar agentes:', err);
          toast({
            title: "Erro",
            description: "Não foi possível carregar a lista de atendentes.",
            variant: "destructive"
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, toast]);

  const handleTransfer = async () => {
    if (!selectedAgent && !selectedSector) return;

    try {
      // Se tiver agente selecionado, transfere
      if (selectedAgent) {
        await transferMutation.mutateAsync({
          id: chatId,
          attendantId: selectedAgent
        });
      }

      // Se tiver setor selecionado, adiciona label
      if (selectedSector) {
        const sectorName = sectors.find(s => s.id === selectedSector)?.name;
        if (sectorName) {
          await chatwootAPI.addLabel(Number(chatId), [sectorName]);
        }
      }

      // Se houver nota, envia como mensagem privada (internal note)
      if (transferNote.trim()) {
        await chatwootAPI.sendMessage(Number(chatId), transferNote, true);
      }

      toast({
        title: "Atendimento transferido!",
        description: `Conversa com ${clientName} foi finalizada com sucesso.`,
      });

      // Log de Auditoria
      const targetAgent = agents.find(a => String(a.id) === selectedAgent)?.name;
      const targetSector = sectors.find(s => s.id === selectedSector)?.name;
      
      await logAuditAction('chat_transfer', {
        toAgent: targetAgent || null,
        toSector: targetSector || null,
        note: transferNote || null,
        clientName
      }, 'chat', chatId);

      setSelectedAgent(null);
      setSelectedSector(null);
      setTransferNote('');
      onClose();
    } catch (error) {
      console.error('Erro na transferência:', error);
      toast({
        title: "Erro na transferência",
        description: "Ocorreu um problema ao tentar transferir o atendimento.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (agent: ChatwootAgent) => {
    // Chatwoot simplificado para este exemplo
    return 'bg-success/10 text-success border-success/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Transferir Atendimento
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Gerenciando conversa com <strong>{clientName}</strong>
            {currentAttendant && ` (atual: ${currentAttendant})`}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de Setor */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Tag className="w-4 h-4" /> Classificar Setor:
            </h4>
            <div className="flex gap-2">
              {sectors.map((sector) => (
                <Badge
                  key={sector.id}
                  variant={selectedSector === sector.id ? "default" : "outline"}
                  className={`cursor-pointer px-3 py-1 ${selectedSector === sector.id ? sector.color : 'hover:bg-muted'
                    }`}
                  onClick={() => setSelectedSector(selectedSector === sector.id ? null : sector.id)}
                >
                  {sector.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selecionar Atendente:</h4>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(selectedAgent === String(agent.id) ? null : String(agent.id))}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedAgent === String(agent.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-white text-xs">
                            {agent.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {agent.role === 'administrator' ? 'Administrador' : 'Agente'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusBadge(agent)}>
                        Disponível
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nota interna (opcional):</label>
            <Textarea
              placeholder="Adicione observações para o próximo atendente..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              className="min-h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedAgent && !selectedSector}
            className="bg-gradient-primary hover:shadow-primary text-white"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};