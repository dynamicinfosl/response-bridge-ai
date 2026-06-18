import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';
import type { Feedback } from '@/hooks/useFeedbacks';
import { useCreateFeedback } from '@/hooks/useFeedbacks';
import { useAuth } from '@/contexts/AuthContext';

export function NovoFeedbackDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const createFeedback = useCreateFeedback();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'bug' as Feedback['tipo'] });

  const submit = async () => {
    if (!form.titulo.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    try {
      await createFeedback.mutateAsync({
        ...form, status: 'novo', created_by: user?.id || null,
        resposta_admin: null, atualizacao_id: null,
      });
      setOpen(false);
      setForm({ titulo: '', descricao: '', tipo: 'bug' });
      toast({ title: 'Feedback enviado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" />Enviar Feedback</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Enviar Feedback</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(s => ({ ...s, titulo: e.target.value }))} placeholder="Ex: Problema ao filtrar..." /></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(s => ({ ...s, descricao: e.target.value }))} placeholder="Descreva o bug, sugestão ou melhoria..." rows={4} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm(s => ({ ...s, tipo: v as Feedback['tipo'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug / Erro</SelectItem>
                <SelectItem value="melhoria">Melhoria</SelectItem>
                <SelectItem value="sugestao">Sugestão</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={submit} disabled={createFeedback.isPending}>
            {createFeedback.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
