import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./CodeBlock";
import { GeneratedAppPreview } from "./GeneratedAppPreview";
import { Users, Scale, Crown, Star, Code } from "lucide-react";
import type { Generation, Stage2Results, Stage3Results } from "@/lib/api";

interface CouncilResultsProps {
  stage1: Generation[];
  stage2: Stage2Results;
  stage3: Stage3Results;
  intent: string;
}

export function CouncilResults({ stage1, stage2, stage3, intent }: CouncilResultsProps) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Resultado do LLM Council</h2>
        <p className="text-muted-foreground">"{intent}"</p>
      </div>

      <Tabs defaultValue="app" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="app" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">App</span>
          </TabsTrigger>
          <TabsTrigger value="stage1" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">1.</span> Geração
          </TabsTrigger>
          <TabsTrigger value="stage2" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">2.</span> Avaliação
          </TabsTrigger>
          <TabsTrigger value="stage3" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">3.</span> Síntese
          </TabsTrigger>
        </TabsList>

        {/* App Generator Tab - Primary */}
        <TabsContent value="app" className="mt-6">
          {stage3.validation.valid ? (
            <GeneratedAppPreview vibeCode={stage3.finalCode} intent={intent} />
          ) : (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">VibeCode Inválido</CardTitle>
                <CardDescription>
                  O código gerado contém erros e não pode ser transformado em app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-destructive space-y-1">
                  {stage3.validation.errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stage1" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {stage1.map((gen, index) => (
              <Card key={gen.personaId} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getPersonaEmoji(gen.personaId)} {gen.personaName}
                    </CardTitle>
                    <Badge variant={gen.validation.valid ? "default" : "destructive"}>
                      {gen.validation.valid ? "Válido" : "Erros"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Proposta #{index + 1}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <CodeBlock 
                    code={gen.code} 
                    validation={gen.validation}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stage2" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Ranking Agregado
              </CardTitle>
              <CardDescription>
                {stage2.recommendation}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stage2.ranking.map((proposalIndex, rankPosition) => {
                  const evaluation = stage2.evaluations[proposalIndex];
                  const generation = stage1[proposalIndex];
                  
                  if (!evaluation || !generation) return null;
                  
                  return (
                    <div 
                      key={proposalIndex}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        rankPosition === 0 ? "border-yellow-500 bg-yellow-500/5" : "border-border"
                      }`}
                    >
                      <div className={`text-2xl font-bold ${
                        rankPosition === 0 ? "text-yellow-500" : "text-muted-foreground"
                      }`}>
                        #{rankPosition + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {getPersonaEmoji(generation.personaId)} {generation.personaName}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm">
                          <ScoreBadge label="Clareza" score={evaluation.scores.clareza} />
                          <ScoreBadge label="Completude" score={evaluation.scores.completude} />
                          <ScoreBadge label="Elegância" score={evaluation.scores.elegancia} />
                          <ScoreBadge label="Robustez" score={evaluation.scores.robustez} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {evaluation.totalScore}
                        </div>
                        <div className="text-xs text-muted-foreground">pontos</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {stage2.evaluations.map((evaluation, index) => {
              const generation = stage1[index];
              if (!generation) return null;
              
              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {getPersonaEmoji(generation.personaId)} {generation.personaName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {evaluation.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-1">Pontos Fortes:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {evaluation.strengths.map((s, i) => (
                            <li key={i}>✅ {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evaluation.weaknesses.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-600 mb-1">Pontos Fracos:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {evaluation.weaknesses.map((w, i) => (
                            <li key={i}>⚠️ {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="stage3" className="mt-6 space-y-6">
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    Código Final Sintetizado
                  </CardTitle>
                  <CardDescription className="mt-1">
                    👔 Chairman: {stage3.chairman}
                  </CardDescription>
                </div>
                <Badge variant={stage3.validation.valid ? "default" : "destructive"} className="text-lg px-4 py-1">
                  {stage3.validation.valid ? "✅ Válido" : "❌ Erros"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeBlock 
                code={stage3.finalCode}
                title="Código VibeCode Final"
                validation={stage3.validation}
              />
              
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-1">💡 Raciocínio:</p>
                <p className="text-sm text-muted-foreground">{stage3.reasoning}</p>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}

function getPersonaEmoji(personaId: string): string {
  switch (personaId) {
    case 'creative': return '🎨';
    case 'conservative': return '🛡️';
    case 'efficient': return '⚡';
    case 'robust': return '🏗️';
    default: return '🤖';
  }
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className={`h-3 w-3 ${score >= 8 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{score}</span>
    </div>
  );
}