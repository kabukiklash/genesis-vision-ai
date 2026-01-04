import { Loader2, Users, Scale, Crown, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface LoadingStagesProps {
  currentStage: number;
  totalStages?: number;
}

const councilStages = [
  {
    id: 1,
    title: "Geração Paralela",
    description: "4 IAs gerando código simultaneamente...",
    icon: Users,
  },
  {
    id: 2,
    title: "Avaliação Cruzada",
    description: "Analisando e ranqueando propostas...",
    icon: Scale,
  },
  {
    id: 3,
    title: "Síntese Final",
    description: "Chairman sintetizando o melhor código...",
    icon: Crown,
  },
];

const directStages = [
  {
    id: 1,
    title: "Geração Direta",
    description: "IA gerando código...",
    icon: Zap,
  },
];

export function LoadingStages({ currentStage, totalStages = 3 }: LoadingStagesProps) {
  const stages = totalStages === 1 ? directStages : councilStages;
  const progress = (currentStage / totalStages) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 p-8">
      <div className="text-center space-y-2">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-bold">
          {totalStages === 1 ? "Geração Direta" : "LLM Council em Ação"}
        </h2>
        <p className="text-muted-foreground">
          {totalStages === 1 
            ? "Gerando código diretamente..."
            : "Processando sua intenção em 3 estágios..."}
        </p>
      </div>

      <Progress value={progress} className="h-3" />

      <div className="space-y-4">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isActive = stage.id === currentStage;
          const isComplete = stage.id < currentStage;

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-lg"
                  : isComplete
                  ? "border-green-500 bg-green-500/5"
                  : "border-border bg-card opacity-50"
              }`}
            >
              <div
                className={`p-3 rounded-full ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isActive ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">
                  {totalStages > 1 && `Stage ${stage.id}: `}{stage.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isComplete ? "✅ Concluído" : stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}