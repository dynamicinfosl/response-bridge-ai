import { useState } from 'react';
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
import { UserCheck, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  currentAttendant?: string;
}

export const TransferModal = ({ isOpen, onClose, clientName, currentAttendant }: TransferModalProps) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const { toast } = useToast();

  const availableAgents = [
    { id: '1', name: 'Carlos Silva', status: 'available', avatar: 'CS', atendimentos: 3 },
    { id: '2', name: 'Ana Santos', status: 'available', avatar: 'AS', atendimentos: 5 },
    { id: '3', name: 'Roberto Lima', status: 'busy', avatar: 'RL', atendimentos: 8 },
    { id: '4', name: 'Mariana Costa', status: 'available', avatar: 'MC', atendimentos: 2 },
  ];

  const handleTransfer = () => {
    if (!selectedAgent) return;
    
    const agent = availableAgents.find(a => a.id === selectedAgent);
    
    toast({
      title: "Atendimento transferido!",
      description: `Conversa com ${clientName} foi transferida para ${agent?.name}`,
    });
    
    setSelectedAgent(null);
    setTransferNote('');
    onClose();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 text-success border-success/20';
      case 'busy':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'busy':
        return 'Ocupado';
      default:
        return 'Offline';
    }
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
            Transferindo conversa com <strong>{clientName}</strong>
            {currentAttendant && ` (atual: ${currentAttendant})`}
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selecionar Atendente:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAgent === agent.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {agent.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.atendimentos} atendimentos ativos
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusBadge(agent.status)}>
                      {getStatusLabel(agent.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nota da transferência (opcional):</label>
            <Textarea
              placeholder="Adicione contexto para o próximo atendente..."
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
            disabled={!selectedAgent}
            className="bg-gradient-primary hover:shadow-primary"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};