// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-primary">Adapt Link SaaS</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Sistema de Atendimento Multicanal com IA
        </p>
        <div className="flex gap-4 justify-center">
          <a 
            href="/login" 
            className="inline-flex items-center px-6 py-3 bg-gradient-primary text-primary-foreground rounded-lg hover:shadow-primary transition-all duration-200"
          >
            Acessar Sistema
          </a>
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-all duration-200"
          >
            Ver Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
