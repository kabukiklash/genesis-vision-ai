import { useState } from "react";
import { IntentInput } from "@/components/IntentInput";
import { LoadingStages } from "@/components/LoadingStages";
import { CouncilResults } from "@/components/CouncilResults";
import { Button } from "@/components/ui/button";
import { processIntent, type ProcessIntentResponse } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type AppState = "input" | "loading" | "results";

const Index = () => {
  const [state, setState] = useState<AppState>("input");
  const [currentStage, setCurrentStage] = useState(1);
  const [results, setResults] = useState<ProcessIntentResponse | null>(null);
  const [currentIntent, setCurrentIntent] = useState("");

  const handleSubmit = async (intent: string) => {
    setCurrentIntent(intent);
    setState("loading");
    setCurrentStage(1);

    try {
      // Simulate stage progression for UX
      const stageInterval = setInterval(() => {
        setCurrentStage((prev) => Math.min(prev + 1, 3));
      }, 5000);

      const response = await processIntent(intent);
      
      clearInterval(stageInterval);
      setCurrentStage(3);
      
      setResults(response);
      setState("results");
      toast.success("Código gerado com sucesso!");
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
        {state === "input" && (
          <div className="flex items-center justify-center min-h-[80vh]">
            <IntentInput onSubmit={handleSubmit} isLoading={false} />
          </div>
        )}

        {state === "loading" && (
          <div className="flex items-center justify-center min-h-[80vh]">
            <LoadingStages currentStage={currentStage} />
          </div>
        )}

        {state === "results" && results && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nova Intenção
            </Button>
            
            <CouncilResults
              stage1={results.stage1}
              stage2={results.stage2}
              stage3={results.stage3}
              intent={currentIntent}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;