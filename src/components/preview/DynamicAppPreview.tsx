import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CodeBlock } from '@/components/CodeBlock';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Lazy load heavy components
const AppChat = lazy(() => import('@/components/chat/AppChat').then(m => ({ default: m.AppChat })));
const LiveCodeRenderer = lazy(() => import('@/components/preview/LiveCodeRenderer').then(m => ({ default: m.LiveCodeRenderer })));
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, Loader2, RefreshCw, Smartphone, Monitor, Code, 
  Copy, Check, Download, AlertCircle, Sparkles, Maximize2, ZoomIn, ZoomOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicAppPreviewProps {
  intent: string;
  vibeCode: string;
  conversationId?: string;
}

interface GeneratedApp {
  appName: string;
  description: string;
  componentCode: string;
  imports?: string[];
  mockData?: string;
}

export function DynamicAppPreview({ intent, vibeCode }: DynamicAppPreviewProps) {
  const [generatedApp, setGeneratedApp] = useState<GeneratedApp | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const lastGeneratedRef = useRef<string>(''); // Track last generated intent+vibeCode

  const generateApp = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-app', {
        body: { intent, vibeCode, type: 'generate' }
      });

      if (fnError) throw fnError;
      if (data.error) {
        // Se houver erro mas tiver código parcial, mostrar aviso mas permitir tentar renderizar
        if (data.raw) {
          toast.warning('Código gerado com avisos. Tentando renderizar mesmo assim...');
          setGeneratedApp({
            appName: 'App Gerado',
            description: 'Código gerado com possíveis problemas',
            componentCode: data.raw,
          });
          return;
        }
        throw new Error(data.error);
      }

      setGeneratedApp(data);
      toast.success('App gerado com sucesso!');
    } catch (err) {
      console.error('Generate error:', err);
      const message = err instanceof Error ? err.message : 'Erro ao gerar app';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [intent, vibeCode]);

  const handleModification = useCallback(async (modification: string) => {
    if (!generatedApp) return;

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-app', {
        body: {
          intent,
          type: 'modify',
          currentCode: generatedApp.componentCode,
          modification
        }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setGeneratedApp(prev => prev ? {
        ...prev,
        componentCode: data.updatedCode || data.componentCode || prev.componentCode
      } : null);

      toast.success('Modificação aplicada!');
    } catch (err) {
      console.error('Modification error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [generatedApp, intent]);

  const handleCopy = async () => {
    if (!generatedApp) return;
    await navigator.clipboard.writeText(generatedApp.componentCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedApp) return;
    const blob = new Blob([generatedApp.componentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedApp.appName || 'App'}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado!');
  };

  // Auto-generate on mount or when intent/vibeCode changes
  useEffect(() => {
    const key = `${intent}|${vibeCode}`;
    
    // Only generate if intent/vibeCode changed and we haven't generated for this combination
    if (intent && vibeCode && lastGeneratedRef.current !== key && !isGenerating) {
      lastGeneratedRef.current = key;
      setGeneratedApp(null);
      setError(null);
      generateApp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, vibeCode]); // Only depend on intent and vibeCode to avoid loops

  if (!generatedApp && !isGenerating && !error) {
    return (
      <Card className="border-2 border-dashed border-primary/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Gerador de App com IA
          </CardTitle>
          <CardDescription>
            A IA irá criar um app React completo baseado na sua intenção
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="p-4 bg-muted rounded-lg text-sm max-w-md">
            <p className="font-medium mb-2">O que será gerado:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Interface completa com todos os recursos</li>
              <li>• Dados mock realistas</li>
              <li>• Interatividade funcional</li>
              <li>• Chat para modificações</li>
            </ul>
          </div>
          <Button size="lg" onClick={generateApp} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar App com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating && !generatedApp) {
    return (
      <Card className="border-2 border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="font-medium">Gerando seu app...</p>
            <p className="text-sm text-muted-foreground">
              A IA está analisando sua intenção e criando o código
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !generatedApp) {
    return (
      <Card className="border-2 border-destructive/50">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={generateApp} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                {generatedApp?.appName || 'App Gerado'}
                <Badge variant="secondary" className="ml-2">IA</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {generatedApp?.description || 'Gerado pela IA com base na sua intenção'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateApp}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Regenerar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Baixar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="gap-1">
                <Play className="h-3 w-3" />
                <span>Preview</span>
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1">
                <Code className="h-3 w-3" />
                <span>Código</span>
              </TabsTrigger>
              <TabsTrigger value="intent" className="gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Intenção</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              {/* View Mode Toggle & Controls */}
              <div className="flex justify-center items-center gap-2 mb-4 flex-wrap">
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4 mr-1" />
                    Mobile
                  </Button>
                  <Button
                    variant={viewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4 mr-1" />
                    Desktop
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground flex items-center px-2">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Preview Frame */}
              {isFullscreen ? (
                <div className="fixed inset-0 z-50 bg-background p-4">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">{generatedApp?.appName || 'Preview'}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFullscreen(false)}
                      >
                        Fechar
                      </Button>
                    </div>
                    <div className="flex-1 overflow-auto border rounded-lg">
                      {generatedApp?.componentCode ? (
                        <Suspense fallback={<LoadingSpinner size="md" />}>
                          <LiveCodeRenderer 
                            code={generatedApp.componentCode} 
                            className="p-4"
                          />
                        </Suspense>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p>Aguardando código gerado...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div
                    className={cn(
                      'border-4 border-foreground/20 rounded-xl overflow-hidden bg-background shadow-xl transition-all',
                      viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-4xl'
                    )}
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                  >
                  {/* Device Header */}
                  <div className="bg-foreground/10 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 text-center text-xs text-muted-foreground truncate">
                      {generatedApp?.appName || 'Preview'}
                    </div>
                  </div>

                  {/* App Content - Live Rendered */}
                  <div 
                    className={cn(
                      'overflow-auto bg-background',
                      viewMode === 'mobile' ? 'h-[600px]' : 'min-h-[500px] max-h-[700px]'
                    )}
                  >
                    {generatedApp?.componentCode ? (
                      <Suspense fallback={<LoadingSpinner size="md" />}>
                        <LiveCodeRenderer 
                          code={generatedApp.componentCode} 
                          className="p-4"
                        />
                      </Suspense>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Aguardando código gerado...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </TabsContent>

            <TabsContent value="code" className="mt-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <div className="max-h-[500px] overflow-auto">
                  <CodeBlock 
                    code={generatedApp?.componentCode || '// Código não disponível'} 
                    title={`${generatedApp?.appName || 'App'}.tsx`} 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="intent" className="mt-4">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Intenção Original:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {intent}
                  </p>
                </div>
                {vibeCode && (
                  <div>
                    <p className="text-sm font-medium mb-2">VibeCode:</p>
                    <CodeBlock code={vibeCode} title="VibeCode Specification" />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Floating Chat */}
      <Suspense fallback={null}>
        <AppChat onModification={handleModification} isLoading={isGenerating} />
      </Suspense>
    </>
  );
}
