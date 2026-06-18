import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Reply } from 'lucide-react';
import { useUpdateFeedback } from '@/hooks/useFeedbacks';
import type { Feedback } from '@/hooks/useFeedbacks';
import type { Atualizacao } from '@/hooks/useAtualizacoes';

interface Props {
  feedback: Feedback;
  atualizacoes: Atualizacao[];
}

export function ResponderFeedbackDialog({ feedback, atualizacoes }: Props) {
  const { toast } = useToast();
  const updateFeedback = useUpdateFeedback();
  const [open, setOpen] = useState(false);
  const [resposta, setResposta] = useState('');
  const [vincularId, setVincularId] = useState<string>('');

  const submit = async () => {
    if (!resposta.trim()) {
      toast({ title: 'Digite uma resposta', variant: 'destructive' });
      return;
    }
    try {
      const payload: Partial<Feedback> = {
        resposta_admin: resposta,
        status: 'resolvido',
        resolvido_em: new Date().toISOString(),
      };
      if (vincularId) payload.atualizacao_id = vincularId;
      await updateFeedback.mutateAsync({ id: feedback.id, data: payload });
      setOpen(false);
      setResposta('');
      setVincularId('');
      toast({ title: 'Feedback resolvido com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao responder', description: String(err), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 text-primary">
          <Reply className="h-3.5 w-3.5" /> Responder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Responder Feedback</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/40 p-3 rounded-lg text-sm">
            <p className="font-medium">{feedback.titulo}</p>
            <p className="text-muted-foreground mt-1">{feedback.descricao}</p>
          </div>
          <div>
            <Label>Resposta do Administrador</Label>
            <Textarea value={resposta} onChange={e => setResposta(e.target.value)}
              placeholder="Descreva a solução ou a atualização que resolve este feedback..." rows={4} />
          </div>
          <div>
            <Label>Vincular a Atualização (opcional)</Label>
            <Select value={vincularId} onValueChange={setVincularId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {atualizacoes.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={submit} disabled={updateFeedback.isPending}>
            {updateFeedback.isPending ? 'Enviando...' : 'Marcar como Resolvido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
