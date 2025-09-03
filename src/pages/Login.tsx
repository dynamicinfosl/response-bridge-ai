import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import logoImage from '../assets/Adapt-Link-Logo.png';

const Login = () => {
  const [email, setEmail] = useState('admin@adaptlink.com');
  const [password, setPassword] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock login - simulate API call
    setTimeout(() => {
      if (email && password) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o dashboard...",
        });
        navigate('/dashboard');
      } else {
        toast({
          title: "Erro no login",
          description: "Verifique suas credenciais e tente novamente.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
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

                           <div className="text-center text-xs text-muted-foreground pt-3">
               <p>Credenciais de demo:</p>
               <p>admin@adaptlink.com / 123456</p>
             </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;