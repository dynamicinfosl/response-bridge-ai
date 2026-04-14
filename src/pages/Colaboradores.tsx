import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreVertical,
  User,
  Shield,
  Edit,
  Trash2,
  X,
  Users as UsersIcon,
  Building2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { chatwootAPI } from '@/lib/chatwoot';

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = 'master' | 'admin' | 'encarregado' | 'user';
type UserArea = 'tecnica' | 'comercial' | 'financeiro' | '';

interface Colaborador {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  area: UserArea | null;
  supervisor_id: string | null;
  avatar_url: string | null;
  chatwoot_id: number | null;
  password_plain?: string | null;
  phone?: string | null;
  created_at: string;
  supervisor_name?: string;
}

  email: string;
  full_name: string;
  phone: string;
  password: string;
  role: UserRole;
  area: UserArea;
  supervisor_id: string;
}

const EMPTY_FORM: FormData = {
  email: '',
  full_name: '',
  phone: '',
  password: '',
  role: 'user',
  area: '',
  supervisor_id: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  master:      { label: 'Master',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  admin:       { label: 'Admin',        color: 'bg-red-100 text-red-700 border-red-200' },
  encarregado: { label: 'Encarregado', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  user:        { label: 'Usuário',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const AREA_CONFIG: Record<string, { label: string; color: string }> = {
  tecnica:    { label: 'Técnica',    color: 'bg-sky-100 text-sky-700 border-sky-200' },
  comercial:  { label: 'Comercial',  color: 'bg-green-100 text-green-700 border-green-200' },
  financeiro: { label: 'Financeiro', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

function initials(name?: string | null, email?: string): string {
  const src = name || email || '?';
  return src.slice(0, 2).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Colaboradores() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [filtered, setFiltered] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Colaborador | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isMasterOrAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin';

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    console.log('🔵 [Colaboradores] load() iniciou');
    setLoading(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const url = `${SUPABASE_URL}/rest/v1/users?select=id,email,full_name,phone,role,area,supervisor_id,avatar_url,chatwoot_id,password_plain,created_at&order=created_at.desc`;
      console.log('🔵 [Colaboradores] fetch URL:', url.substring(0, 80) + '...');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔵 [Colaboradores] status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 [Colaboradores] Erro:', response.status, errorText);
        toast({ title: 'Erro', description: `HTTP ${response.status}`, variant: 'destructive' });
        return;
      }

      const rows: Colaborador[] = await response.json();
      console.log('🟢 [Colaboradores] Recebidos:', rows.length, 'users');

      setColaboradores(rows);
    } catch (err: any) {
      console.error('🔴 [Colaboradores] Exceção:', err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      console.log('🔵 [Colaboradores] load() finalizado');
    }
  }, []);

  // Disparar no mount
  useEffect(() => { load(); }, [load]);

  // ── Filter ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let list = [...colaboradores];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
      );
    }
    if (filterArea !== 'all') list = list.filter(u => u.area === filterArea);
    if (filterRole !== 'all') list = list.filter(u => u.role === filterRole);
    setFiltered(list);
  }, [colaboradores, search, filterArea, filterRole]);

  // ── Form helpers ────────────────────────────────────────────────────────────

  const resetForm = () => { setForm(EMPTY_FORM); setSelected(null); };

  const openEdit = (u: Colaborador) => {
    setSelected(u);
    setForm({
      email:        u.email || '',
      full_name:    u.full_name || '',
      phone:        u.phone || '',
      password:     u.password_plain || '',
      role:         u.role || 'user',
      area:         (u.area as UserArea) || '',
      supervisor_id: u.supervisor_id || '',
    });
    setEditOpen(true);
  };

  const openDelete = (u: Colaborador) => {
    setSelected(u);
    setDeleteOpen(true);
  };

  // ── Supervisors list for selects ─────────────────────────────────────────────

  const supervisorOptions = colaboradores.filter(
    u => u.role === 'master' || u.role === 'admin' || u.role === 'encarregado'
  );

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.email || !form.full_name) {
      toast({ title: 'Preencha email e nome', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const password = form.password || `Temp${Math.random().toString(36).slice(-8)}!`;

      // Usa RPC para criar usuário já confirmado (sem precisar de confirmação por email)
      const { data: newUserId, error: rpcError } = await supabase.rpc('admin_create_user', {
        user_email: form.email,
        user_password: password,
        user_name: form.full_name,
        user_phone: form.phone || null,
      });

      if (rpcError) throw rpcError;
      if (!newUserId) throw new Error('Usuário não criado');

      const userId = newUserId as string;

      // 🔄 Sincronizar com Chatwoot
      let chatwootId: number | null = null;
      try {
        const cwRole = (form.role === 'master' || form.role === 'admin') ? 'administrator' : 'agent';
        const cwAgent = await chatwootAPI.createAgent(form.email, form.full_name, cwRole);
        chatwootId = cwAgent?.id || null;
      } catch (cwErr) {
        console.error('Falha ao sincronizar com Chatwoot:', cwErr);
        toast({ title: 'Aviso', description: 'Usuário criado no sistema, mas houve erro ao cadastrar no Chatwoot.', variant: 'warning' as any });
      }

      // Update via fetch direto
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            role:         form.role,
            area:         form.area || null,
            supervisor_id: form.supervisor_id || null,
            full_name:    form.full_name,
            phone:        form.phone || null,
            chatwoot_id:  chatwootId,
            password_plain: password,
          }),
        }
      );

      if (!response.ok) {
        console.warn('Update após criar falhou, mas auth user foi criado');
      }

      await load();
      toast({ title: `Usuário criado! Senha: ${password}` });
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncChatwoot = async (u: Colaborador) => {
    setSaving(true);
    try {
      const cwRole = (u.role === 'master' || u.role === 'admin') ? 'administrator' : 'agent';
      const cwAgent = await chatwootAPI.createAgent(u.email, u.full_name || u.email, cwRole);
      
      if (cwAgent?.id) {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

        await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${u.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ chatwoot_id: cwAgent.id }),
          }
        );
        toast({ title: 'Sincronizado com sucesso!' });
        load();
      }
    } catch (err: any) {
      toast({ title: 'Erro na sincronização', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const body = {
        full_name:    form.full_name,
        role:         form.role,
        area:         form.area || null,
        supervisor_id: form.supervisor_id || null,
        phone:        form.phone || null,
        password_plain: form.password,
      };

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${selected.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      // 🔐 Se a senha foi preenchida, altera a senha real de login via RPC
      if (form.password) {
        const { error: rpcError } = await supabase.rpc('admin_change_user_password', {
          target_user_id: selected.id,
          new_password: form.password
        });
        
        if (rpcError) {
          console.error('Erro ao mudar senha real:', rpcError);
          toast({ 
            title: 'Aviso', 
            description: 'Dados salvos, mas houve um erro ao atualizar a senha real de login.', 
            variant: 'warning' as any 
          });
        }
      }

      await load();
      toast({ title: 'Salvo com sucesso!' });
      setEditOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // 🔄 Remover do Chatwoot se existir ID
      if (selected.chatwoot_id) {
        try {
          await chatwootAPI.deleteAgent(selected.chatwoot_id);
        } catch (cwErr) {
          console.error('Falha ao remover do Chatwoot:', cwErr);
        }
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${selected.id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      toast({ title: 'Colaborador removido' });
      setDeleteOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = {
    total:  colaboradores.length,
    byArea: new Set(colaboradores.filter(u => u.area).map(u => u.area)).size,
    admins: colaboradores.filter(u => u.role === 'master' || u.role === 'admin').length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Colaboradores</h1>
            <p className="text-muted-foreground text-sm">Gerencie os usuários e suas permissões</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {isMasterOrAdmin && (
              <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Novo Colaborador
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg"><UsersIcon className="w-5 h-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Building2 className="w-5 h-5 text-blue-500" /></div>
              <div><p className="text-xs text-muted-foreground">Áreas</p><p className="text-2xl font-bold">{stats.byArea}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-2 bg-red-500/10 rounded-lg"><Shield className="w-5 h-5 text-red-500" /></div>
              <div><p className="text-xs text-muted-foreground">Admins</p><p className="text-2xl font-bold">{stats.admins}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar colaboradores..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Todas as áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  <SelectItem value="tecnica">Técnica</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Todas as roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as roles</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="encarregado">Encarregado</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
              {(search || filterArea !== 'all' || filterRole !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterArea('all'); setFilterRole('all'); }}>
                  <X className="w-4 h-4 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-primary" />
              Lista de Colaboradores ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {colaboradores.length === 0
                  ? 'Nenhum colaborador cadastrado.'
                  : 'Nenhum resultado para os filtros aplicados.'}
              </div>
            ) : (
              <div className="divide-y overflow-x-auto">
                {filtered.map(u => (
                  <div key={u.id} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-4 hover:bg-muted/30 transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {initials(u.full_name, u.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      {u.supervisor_name && (
                        <p className="text-xs text-muted-foreground">Supervisor: {u.supervisor_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {u.role in ROLE_CONFIG && (
                        <Badge variant="outline" className={`text-xs ${ROLE_CONFIG[u.role].color}`}>
                          {ROLE_CONFIG[u.role].label}
                        </Badge>
                      )}
                      {u.area && u.area in AREA_CONFIG && (
                        <Badge variant="outline" className={`text-xs ${AREA_CONFIG[u.area].color}`}>
                          {AREA_CONFIG[u.area].label}
                        </Badge>
                      )}
                    </div>
                    {isMasterOrAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-60 hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          {!u.chatwoot_id && (
                            <DropdownMenuItem onClick={() => handleSyncChatwoot(u)}>
                              <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar Chatwoot
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openDelete(u)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1">
              <Label>Nome Completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nome do colaborador" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                  placeholder="Deixe vazio para senha aleatória" 
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="encarregado">Encarregado</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Área</Label>
                <Select value={form.area || 'none'} onValueChange={v => setForm(f => ({ ...f, area: v === 'none' ? '' : v as UserArea }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="tecnica">Técnica</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Supervisor</Label>
              <Select value={form.supervisor_id || 'none'} onValueChange={v => setForm(f => ({ ...f, supervisor_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {supervisorOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>Atualize os dados de {selected?.full_name || selected?.email}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label>Nome Completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nome do colaborador" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                  placeholder="Nova senha" 
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="encarregado">Encarregado</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Área</Label>
                <Select value={form.area || 'none'} onValueChange={v => setForm(f => ({ ...f, area: v === 'none' ? '' : v as UserArea }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="tecnica">Técnica</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Supervisor</Label>
              <Select value={form.supervisor_id || 'none'} onValueChange={v => setForm(f => ({ ...f, supervisor_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {supervisorOptions.filter(s => s.id !== selected?.id).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ────────────────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{selected?.full_name || selected?.email}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
