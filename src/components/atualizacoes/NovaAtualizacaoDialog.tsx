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
import { Plus } from 'lucide-react';
import type { Atualizacao } from '@/hooks/useAtualizacoes';
import { useCreateAtualizacao } from '@/hooks/useAtualizacoes';
import { useAuth } from '@/contexts/AuthContext';

export function NovaAtualizacaoDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const createAtualizacao = useCreateAtualizacao();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descricao: '', tipo: 'melhoria' as Atualizacao['tipo'],
    status: 'concluido' as Atualizacao['status'], versao: '',
  });

  const submit = async () => {
    if (!form.titulo.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    try {
      await createAtualizacao.mutateAsync({
        ...form, created_by: user?.id || null,
        published_at: new Date().toISOString(), is_published: true, link_feedback_id: null,
      });
      setOpen(false);
      setForm({ titulo: '', descricao: '', tipo: 'melhoria', status: 'concluido', versao: '' });
      toast({ title: 'Atualização publicada!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-1.5"><Plus className="h-4 w-4" />Nova Atualização</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Publicar Nova Atualização</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(s => ({ ...s, titulo: e.target.value }))} placeholder="Ex: Nova funcionalidade..." /></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(s => ({ ...s, descricao: e.target.value }))} placeholder="Descreva a atualização..." rows={4} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(s => ({ ...s, tipo: v as Atualizacao['tipo'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="melhoria">Melhoria</SelectItem>
                  <SelectItem value="correcao">Correção</SelectItem>
                  <SelectItem value="novidade">Novidade</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Versão</Label><Input value={form.versao} onChange={e => setForm(s => ({ ...s, versao: e.target.value }))} placeholder="Ex: 1.2.0" /></div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={submit} disabled={createAtualizacao.isPending}>
            {createAtualizacao.isPending ? 'Publicando...' : 'Publicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
