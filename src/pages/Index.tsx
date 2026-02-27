import { useState } from "react";
import { IntentInput } from "@/components/IntentInput";
import { LoadingStages } from "@/components/LoadingStages";
import { CouncilResults } from "@/components/CouncilResults";
import { AuthButton } from "@/components/auth/AuthButton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { processIntent, type ProcessIntentResponse } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Users, Zap, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

type AppState = "input" | "loading" | "results";

const Index = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<AppState>("input");
  const [currentStage, setCurrentStage] = useState(1);
  const [results, setResults] = useState<ProcessIntentResponse | null>(null);
  const [currentIntent, setCurrentIntent] = useState("");
  const [councilEnabled, setCouncilEnabled] = useState(true);

  const handleSubmit = async (intent: string) => {
    // Validação: rejeitar input vazio
    if (!intent.trim()) {
      toast.error("Campo obrigatório", {
        description: "Por favor, descreva o sistema que deseja criar",
      });
      return;
    }
    setCurrentIntent(intent);
    setState("loading");
    setCurrentStage(1);

    try {
      // Simulate stage progression for UX (only if council enabled)
      const stageInterval = councilEnabled
        ? setInterval(() => {
            setCurrentStage((prev) => Math.min(prev + 1, 3));
          }, 5000)
        : null;

      const response = await processIntent(intent, { skipCouncil: !councilEnabled });

      if (stageInterval) clearInterval(stageInterval);
      setCurrentStage(3);

      setResults(response);
      setState("results");
      toast.success(councilEnabled ? "Código gerado pelo Council!" : "Código gerado diretamente!");
    } catch (error) {
      console.error("Error processing intent:", error);
      setState("input");

      if (error instanceof Error) {
        if (error.message.includes("429")) {
          toast.error("Rate limit excedido. Tente novamente em alguns minutos.");
        } else if (error.message.includes("402")) {
          toast.error("Créditos insuficientes. Adicione créditos à sua conta.");
        } else {
          toast.error(error.message || "Erro ao processar intenção");
        }
      } else {
        toast.error("Erro desconhecido ao processar intenção");
      }
    }
  };

  const handleReset = () => {
    setState("input");
    setResults(null);
    setCurrentIntent("");
    setCurrentStage(1);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto">
        {/* Auth Button - Top Right */}
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Configurações">
            <Settings className="h-5 w-5" />
          </Button>
          <AuthButton />
        </div>
        {state === "input" && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
            <IntentInput onSubmit={handleSubmit} isLoading={false} />

            {/* Council Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50">
              <Zap className={`h-4 w-4 ${!councilEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <Label
                htmlFor="council-toggle"
                className={`text-sm cursor-pointer ${!councilEnabled ? "text-foreground" : "text-muted-foreground"}`}
              >
                Direto
              </Label>
              <Switch id="council-toggle" checked={councilEnabled} onCheckedChange={setCouncilEnabled} />
              <Label
                htmlFor="council-toggle"
                className={`text-sm cursor-pointer ${councilEnabled ? "text-foreground" : "text-muted-foreground"}`}
              >
                Council
              </Label>
              <Users className={`h-4 w-4 ${councilEnabled ? "text-primary" : "text-muted-foreground"}`} />
            </div>

            <p className="text-xs text-muted-foreground max-w-md text-center">
              {councilEnabled
                ? "Council: 4 IAs geram propostas em paralelo, avaliam e sintetizam (mais lento, mais robusto)"
                : "Direto: 1 IA gera o código diretamente (mais rápido, para testes)"}
            </p>
          </div>
        )}

        {state === "loading" && (
          <div className="flex items-center justify-center min-h-[80vh]">
            <LoadingStages currentStage={councilEnabled ? currentStage : 1} totalStages={councilEnabled ? 3 : 1} />
          </div>
        )}

        {state === "results" && results && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleReset} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nova Intenção
            </Button>

            <CouncilResults
              stage1={results.stage1}
              stage2={results.stage2}
              stage3={results.stage3}
              intent={currentIntent}
              conversationId={results.conversationId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
