import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CodeBlock } from './CodeBlock';
import { LiveAppPreview, FinancialAppPreview } from './vibecode';
import { generateReactApp, GeneratedApp } from '@/lib/vibecode/generator';
import { Code, FileCode, Palette, Play, Download, Copy, Check, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedAppPreviewProps {
  vibeCode: string;
  intent: string;
}

function detectAppType(intent: string): 'financial' | 'generic' {
  const lower = intent.toLowerCase();
  const financialKeywords = [
    'financ', 'gestão', 'dinheiro', 'receita', 'despesa', 'cartão', 'cartao',
    'salário', 'salario', 'renda', 'economia', 'investimento', 'fatura',
    'orçamento', 'orcamento', 'banco', 'conta', 'pagamento', 'gasto'
  ];
  return financialKeywords.some(kw => lower.includes(kw)) ? 'financial' : 'generic';
}

export function GeneratedAppPreview({ vibeCode, intent }: GeneratedAppPreviewProps) {
  const [generatedApp, setGeneratedApp] = useState<GeneratedApp | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const appType = useMemo(() => detectAppType(intent), [intent]);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate generation delay for UX
    setTimeout(() => {
      const app = generateReactApp(vibeCode, intent);
      setGeneratedApp(app);
      setIsGenerating(false);
      toast.success('App gerado com sucesso!');
    }, 500);
  };

  const handleCopy = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(type);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = () => {
    if (!generatedApp) return;

    const files = [
      { name: `${generatedApp.appName}.tsx`, content: generatedApp.componentCode },
      { name: 'useVibeCode-example.tsx', content: generatedApp.hookCode },
      { name: 'styles.css', content: generatedApp.cssCode },
    ];

    files.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });

    toast.success('Arquivos baixados!');
  };

  if (!generatedApp) {
    return (
      <Card className="border-2 border-dashed border-primary/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            Gerador de App React
          </CardTitle>
          <CardDescription>
            Transforme o VibeCode em um componente React funcional
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="p-4 bg-muted rounded-lg text-sm max-w-md">
            <p className="font-medium mb-2">O que será gerado:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Componente React com state machine</li>
              <li>• UI adaptativa para cada estado</li>
              <li>• Controle de fricção integrado</li>
              <li>• Exemplos de uso do hook</li>
            </ul>
          </div>
          <Button 
            size="lg" 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>Gerando...</>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Gerar App React
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              {generatedApp.appName}
            </CardTitle>
            <CardDescription className="mt-1">
              Componente React gerado a partir do VibeCode
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Baixar
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              Regenerar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="live" className="gap-1">
              <Smartphone className="h-3 w-3" />
              <span className="hidden sm:inline">Live</span>
            </TabsTrigger>
            <TabsTrigger value="component" className="gap-1">
              <FileCode className="h-3 w-3" />
              <span className="hidden sm:inline">Componente</span>
            </TabsTrigger>
            <TabsTrigger value="hook" className="gap-1">
              <Code className="h-3 w-3" />
              <span className="hidden sm:inline">Hook</span>
            </TabsTrigger>
            <TabsTrigger value="css" className="gap-1">
              <Palette className="h-3 w-3" />
              <span className="hidden sm:inline">CSS</span>
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-1">
              <Play className="h-3 w-3" />
              <span className="hidden sm:inline">VibeCode</span>
            </TabsTrigger>
          </TabsList>

          {/* Live Preview Tab - Primary */}
          <TabsContent value="live" className="mt-4">
            {appType === 'financial' ? (
              <FinancialAppPreview vibeCode={vibeCode} intent={intent} />
            ) : (
              <LiveAppPreview vibeCode={vibeCode} intent={intent} />
            )}
          </TabsContent>

          <TabsContent value="component" className="mt-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => handleCopy(generatedApp.componentCode, 'component')}
              >
                {copied === 'component' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <div className="max-h-[500px] overflow-auto">
                <CodeBlock code={generatedApp.componentCode} title={`${generatedApp.appName}.tsx`} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hook" className="mt-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => handleCopy(generatedApp.hookCode, 'hook')}
              >
                {copied === 'hook' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <CodeBlock code={generatedApp.hookCode} title="Exemplo de uso do Hook" />
            </div>
          </TabsContent>

          <TabsContent value="css" className="mt-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => handleCopy(generatedApp.cssCode, 'css')}
              >
                {copied === 'css' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <CodeBlock code={generatedApp.cssCode} title="styles.css" />
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>VibeCode Original:</strong> A especificação declarativa que define os estados e a fricção do app.
                </p>
              </div>
              <CodeBlock code={vibeCode} title="VibeCode Specification" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm font-medium mb-2">📋 Como usar o código gerado:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Copie o componente para <code className="bg-muted px-1 rounded">src/components/</code></li>
            <li>Importe o hook <code className="bg-muted px-1 rounded">useVibeCode</code> já disponível no projeto</li>
            <li>Adicione o CSS ao seu arquivo de estilos</li>
            <li>Use o componente na sua aplicação</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
