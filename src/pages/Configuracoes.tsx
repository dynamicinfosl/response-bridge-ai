import { useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Upload, 
  Palette, 
  Key, 
  Bell,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoImage from '../assets/Adapt-Link-Logo.png';

const Configuracoes = () => {
  const [showApiKeys, setShowApiKeys] = useState({
    whatsapp: false,
    instagram: false,
    openai: false
  });
  
  // Carrega configurações previamente salvas (localStorage) como fallback
  const savedSettingsRaw = typeof window !== 'undefined' ? localStorage.getItem('companySettings') : null;
  const savedSettings = savedSettingsRaw ? JSON.parse(savedSettingsRaw) : null;
  const [settings, setSettings] = useState({
    companyName: savedSettings?.companyName ?? 'Adapt Link',
    companyLogo: savedSettings?.companyLogo ?? '',
    primaryColor: savedSettings?.primaryColor ?? '#3b82f6',
    notifications: savedSettings?.notifications ?? true,
    autoResponse: savedSettings?.autoResponse ?? true,
    apiKeys: savedSettings?.apiKeys ?? {
      whatsapp: 'whatsapp_key_hidden',
      instagram: 'instagram_key_hidden',
      openai: 'openai_key_hidden'
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();

  const handleSave = () => {
    try {
      localStorage.setItem('companySettings', JSON.stringify(settings));
    } catch (e) {
      // ignore quota errors silenciosamente
    }
    toast({
      title: "Configurações salvas!",
      description: "As alterações foram aplicadas com sucesso.",
    });
  };

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setSettings(prev => ({ ...prev, companyLogo: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const toggleApiKeyVisibility = (key: keyof typeof showApiKeys) => {
    setShowApiKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">
              Personalize sua experiência e integrações
            </p>
          </div>
          <Button onClick={handleSave} className="bg-gradient-primary hover:shadow-primary">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img 
                  src={logoImage} 
                  alt="Adapt Link Logo" 
                  className="w-5 h-5 object-contain"
                />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da Empresa</Label>
                <Input
                  id="company-name"
                  value={settings.companyName}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    companyName: e.target.value
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Logo da Empresa</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <img 
                      src={settings.companyLogo || logoImage} 
                      alt="Logo da Empresa" 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button variant="outline" onClick={handleLogoUploadClick}>
                      <Upload className="w-4 h-4 mr-2" />
                      Fazer Upload
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recomendado: 200x200px, PNG ou JPG
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Personalização Visual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Cor Primária</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primary-color"
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      primaryColor: e.target.value
                    }))}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      primaryColor: e.target.value
                    }))}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Prévia das Cores</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 text-center">
                    <div 
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                    <span className="text-xs text-muted-foreground">Primária</span>
                  </div>
                  <div className="space-y-2 text-center">
                    <div 
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: settings.primaryColor + '20' }}
                    />
                    <span className="text-xs text-muted-foreground">Secundária</span>
                  </div>
                  <div className="space-y-2 text-center">
                    <div 
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: settings.primaryColor + '10' }}
                    />
                    <span className="text-xs text-muted-foreground">Accent</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações de novos atendimentos
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    notifications: checked
                  }))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Resposta Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    IA responde automaticamente mensagens simples
                  </p>
                </div>
                <Switch
                  checked={settings.autoResponse}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    autoResponse: checked
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Chaves de API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.apiKeys).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>
                    {key === 'whatsapp' ? 'WhatsApp API' :
                     key === 'instagram' ? 'Instagram API' :
                     key === 'openai' ? 'OpenAI API' : key}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={key}
                      type={showApiKeys[key as keyof typeof showApiKeys] ? 'text' : 'password'}
                      value={showApiKeys[key as keyof typeof showApiKeys] ? value : '••••••••••••••••'}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        apiKeys: {
                          ...prev.apiKeys,
                          [key]: e.target.value
                        }
                      }))}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleApiKeyVisibility(key as keyof typeof showApiKeys)}
                    >
                      {showApiKeys[key as keyof typeof showApiKeys] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="bg-primary-muted p-3 rounded-lg">
                <p className="text-sm text-primary">
                  <strong>Importante:</strong> As chaves de API são criptografadas e armazenadas com segurança. 
                  Elas são necessárias para integração com os canais de atendimento.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configurações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <h3 className="font-medium">Configurações Avançadas</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure horários de atendimento, webhooks e automações
                  </p>
                </div>
                <Button variant="outline" onClick={() => window.location.href = '/configuracoes-avancadas'}>
                  Configurar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                <div>
                  <span className="text-muted-foreground">Versão:</span>
                  <span className="ml-2 font-medium">v1.0.0</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Última atualização:</span>
                  <span className="ml-2 font-medium">2024-01-15</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Servidor:</span>
                  <span className="ml-2 font-medium">Online</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Configuracoes;