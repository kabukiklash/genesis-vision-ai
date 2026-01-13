import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { getIntentExamples, incrementIntentExampleUsage, type IntentExample } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface IntentInputProps {
  onSubmit: (intent: string) => void;
  isLoading: boolean;
}

// Fallback estático caso a API falhe
const FALLBACK_EXAMPLES = [
  "Sistema de gestão de vendas com controle de estoque",
  "Plataforma de suporte técnico com tickets",
  "Dashboard IoT para monitoramento de sensores",
  "Sistema de agendamento de consultas médicas",
  "Workflow de aprovação de documentos",
];

export function IntentInput({ onSubmit, isLoading }: IntentInputProps) {
  const [intent, setIntent] = useState("");

  // Buscar exemplos dinâmicos do banco
  const { data: examples = [] } = useQuery({
    queryKey: ['intent-examples'],
    queryFn: () => getIntentExamples({ featured: true, limit: 10 }),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Usar exemplos do banco ou fallback
  const displayExamples = examples.length > 0 
    ? examples.map(ex => ex.intent_text)
    : FALLBACK_EXAMPLES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intent.trim() && !isLoading) {
      onSubmit(intent.trim());
    }
  };

  const handleExampleClick = async (example: IntentExample | string) => {
    const intentText = typeof example === 'string' ? example : example.intent_text;
    setIntent(intentText);
    
    // Incrementar contador de uso se for um exemplo do banco
    if (typeof example !== 'string' && example.id) {
      try {
        await incrementIntentExampleUsage(example.id);
      } catch (error) {
        console.warn('Failed to increment usage:', error);
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
          🎯 Genesis Vision
        </h1>
        <p className="text-muted-foreground text-lg">
          Programação por Intenção com LLM Council
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Descreva o sistema que você quer criar..."
            className="min-h-[150px] text-lg resize-none pr-4 bg-card border-2 border-border focus:border-primary transition-colors"
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full text-lg h-14 bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:from-primary/90 hover:via-purple-600/90 hover:to-pink-600/90 transition-all"
          disabled={!intent.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processando com LLM Council...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Gerar Código
            </>
          )}
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">
          💡 Exemplos rápidos:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {displayExamples.map((example, index) => {
            const exampleObj = examples.find(ex => ex.intent_text === example);
            const displayText = example.length > 35 ? example.substring(0, 35) + "..." : example;
            
            return (
              <Button
                key={exampleObj?.id || index}
                variant="outline"
                size="sm"
                onClick={() => handleExampleClick(exampleObj || example)}
                disabled={isLoading}
                className="text-xs hover:bg-primary/10 hover:border-primary transition-colors"
                title={exampleObj?.description || example}
              >
                {displayText}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}