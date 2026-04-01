import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, HelpCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import logoImage from '../assets/Adapt-Link-Logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user, loading } = useAuth();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Carregar credenciais salvas se "Lembrar-me" estava ativado
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro no login",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    const { error } = await signIn(email, password);
    
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
             <Card className="w-full max-w-sm shadow-elevated">
                  <CardHeader className="text-center pb-2">
            <div className="mx-auto w-32 h-32 flex items-center justify-center mb-1">
              <img 
                src={logoImage} 
                alt="Adapt Link Logo" 
                className="w-32 h-32 object-contain"
              />
            </div>
            <p className="text-muted-foreground text-sm">Atendimento</p>
            <CardTitle className="text-xl font-bold text-foreground">
              Acesso ao Sistema
            </CardTitle>
            
          </CardHeader>
         <CardContent className="px-4 pb-4">
                                             <form onSubmit={handleLogin} className="space-y-6">
                                                    <div className="space-y-3">
                <Label htmlFor="email" className="text-xs font-medium">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-7 h-8 text-sm"
                    required
                  />
                </div>
              </div>

                                                                                                                       <div className="space-y-3">
                 <div className="flex items-center justify-between">
                   <Label htmlFor="password" className="text-xs font-medium">
                     Senha
                   </Label>
                   <a href="/recuperar-senha" className="text-xs font-medium text-primary hover:underline">Esqueceu sua senha?</a>
                 </div>
                                   <div className="relative">
                    <Lock className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-7 h-8 text-sm"
                      required
                    />
                  </div>
                                     <div className="flex items-center space-x-2 pt-1">
                     <Checkbox
                       id="remember"
                       checked={rememberMe}
                       onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                     />
                     <label
                       htmlFor="remember"
                       className="text-xs text-muted-foreground cursor-pointer"
                     >
                       Lembrar dados de login
                     </label>
                   </div>
                </div>

                                                       <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:shadow-primary transition-all duration-200 h-8 text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </div>

             <div className="text-center text-xs text-muted-foreground pt-3 space-y-2">
               <p>Use suas credenciais do seu cadastro para fazer o login.</p>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 className="text-xs text-muted-foreground hover:text-primary h-auto p-1"
                 onClick={() => window.location.href = 'mailto:suporte@adaptlink.com?subject=Dificuldade no Login'}
               >
                 <HelpCircle className="h-3 w-3 mr-1 inline" />
                 Falar com suporte
               </Button>
             </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;