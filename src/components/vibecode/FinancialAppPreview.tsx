import { useState, useCallback, useEffect } from 'react';
import { useVibeCode } from '@/hooks/useVibeCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StateIndicator, FrictionMeter } from '@/components/vibecode';
import { 
  Wallet, CreditCard, Target, PieChart, TrendingUp, TrendingDown,
  DollarSign, AlertTriangle, Bell, Plus, Minus, Home, Car, 
  Utensils, Heart, Plane, Gift, Zap, Droplets, Wifi,
  Play, RotateCcw, Smartphone, Monitor, CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FinancialAppPreviewProps {
  vibeCode: string;
  intent: string;
}

// Mock data for the financial app
const initialData = {
  income: {
    salary1: 8500,
    salary2: 6200,
    freelance: 1200,
    investments: 450,
    rent: 1800,
  },
  expenses: {
    fixed: {
      housing: 2500,
      condo: 800,
      internet: 150,
      electricity: 280,
      water: 120,
    },
    variable: {
      food: 1800,
      transport: 600,
      health: 400,
    },
    occasional: {
      emergencies: 0,
      gifts: 200,
      travel: 0,
    },
  },
  cards: [
    { name: 'Pessoa 1 - Principal', limit: 8000, used: 2400, dueDate: 10 },
    { name: 'Pessoa 2 - Principal', limit: 5000, used: 1800, dueDate: 15 },
    { name: 'Adicional', limit: 3000, used: 600, dueDate: 20 },
  ],
  goals: {
    monthlyEconomy: { target: 20, current: 15 },
    emergencyFund: { target: 41700, current: 28000 },
    travel: { target: 15000, current: 8500 },
  },
  notifications: [] as string[],
};

export function FinancialAppPreview({ vibeCode, intent }: FinancialAppPreviewProps) {
  const {
    state,
    friction,
    transitionTo,
    reset,
    canTransitionTo,
    stateColor,
    frictionOpacity,
    setFriction,
  } = useVibeCode(vibeCode);

  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(initialData);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Calculate totals
  const totalIncome = Object.values(data.income).reduce((a, b) => a + b, 0);
  const totalFixedExpenses = Object.values(data.expenses.fixed).reduce((a, b) => a + b, 0);
  const totalVariableExpenses = Object.values(data.expenses.variable).reduce((a, b) => a + b, 0);
  const totalOccasionalExpenses = Object.values(data.expenses.occasional).reduce((a, b) => a + b, 0);
  const totalExpenses = totalFixedExpenses + totalVariableExpenses + totalOccasionalExpenses;
  const balance = totalIncome - totalExpenses;
  const totalCardUsage = data.cards.reduce((a, b) => a + b.used, 0);
  const cardToIncomeRatio = (totalCardUsage / totalIncome) * 100;

  // Automation checks
  useEffect(() => {
    const newNotifications: string[] = [];
    
    // Check if fixed expenses increased > 15%
    if (totalFixedExpenses > 4500) {
      newNotifications.push('⚠️ Despesas fixas acima do normal (+15%)');
    }
    
    // Critical alert if income < fixed expenses
    if (totalIncome < totalFixedExpenses) {
      newNotifications.push('🚨 ALERTA CRÍTICO: Receita menor que despesas fixas!');
      if (canTransitionTo('ERROR')) {
        transitionTo('ERROR');
        setFriction(0.9);
      }
    }
    
    // Card usage alert
    if (cardToIncomeRatio > 40) {
      newNotifications.push(`⚠️ Faturas de cartões > 40% da receita (${cardToIncomeRatio.toFixed(0)}%)`);
      setFriction(Math.min(1, friction + 0.2));
    }
    
    // Suggest investment if balance > goal
    if (balance > 3000) {
      newNotifications.push('💡 Saldo positivo alto! Considere investir o excedente');
    }

    setNotifications(newNotifications);
  }, [data, totalIncome, totalFixedExpenses, cardToIncomeRatio, balance]);

  const handleStart = useCallback(() => {
    if (canTransitionTo('RUNNING')) {
      transitionTo('RUNNING');
      toast.success('Sistema financeiro iniciado!');
    }
  }, [canTransitionTo, transitionTo]);

  const handleReset = useCallback(() => {
    reset();
    setData(initialData);
    setNotifications([]);
    toast.info('Sistema resetado');
  }, [reset]);

  const addExpense = (category: 'variable' | 'occasional', subcategory: string, amount: number) => {
    setData(prev => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        [category]: {
          ...prev.expenses[category],
          [subcategory]: (prev.expenses[category] as Record<string, number>)[subcategory] + amount,
        }
      }
    }));
    toast.success(`Despesa de R$ ${amount} registrada`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Receita</span>
            </div>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Despesas</span>
            </div>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance */}
      <Card className={cn(
        "border-2",
        balance >= 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
      )}>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Saldo do Mês</p>
          <p className={cn(
            "text-2xl font-bold",
            balance >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-muted rounded">
          <Home className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="font-medium">{formatCurrency(totalFixedExpenses)}</p>
          <p className="text-muted-foreground">Fixas</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <Utensils className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="font-medium">{formatCurrency(totalVariableExpenses)}</p>
          <p className="text-muted-foreground">Variáveis</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <Gift className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="font-medium">{formatCurrency(totalOccasionalExpenses)}</p>
          <p className="text-muted-foreground">Eventuais</p>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Alertas ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {notifications.map((n, i) => (
              <p key={i} className="text-xs">{n}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderIncome = () => (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Fontes de Renda</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="flex justify-between items-center p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm">Salário Pessoa 1</span>
            </div>
            <span className="font-medium">{formatCurrency(data.income.salary1)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm">Salário Pessoa 2</span>
            </div>
            <span className="font-medium">{formatCurrency(data.income.salary2)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Freelances</span>
            </div>
            <span className="font-medium">{formatCurrency(data.income.freelance)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Investimentos</span>
            </div>
            <span className="font-medium">{formatCurrency(data.income.investments)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Aluguéis</span>
            </div>
            <span className="font-medium">{formatCurrency(data.income.rent)}</span>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0">
          <div className="w-full flex justify-between font-bold">
            <span>Total</span>
            <span className="text-green-600">{formatCurrency(totalIncome)}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-3">
      {/* Fixed */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Home className="h-4 w-4" />
            Despesas Fixas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-1 text-sm">
          <div className="flex justify-between"><span>Moradia</span><span>{formatCurrency(data.expenses.fixed.housing)}</span></div>
          <div className="flex justify-between"><span>Condomínio</span><span>{formatCurrency(data.expenses.fixed.condo)}</span></div>
          <div className="flex justify-between"><span>Internet</span><span>{formatCurrency(data.expenses.fixed.internet)}</span></div>
          <div className="flex justify-between"><span>Energia</span><span>{formatCurrency(data.expenses.fixed.electricity)}</span></div>
          <div className="flex justify-between"><span>Água</span><span>{formatCurrency(data.expenses.fixed.water)}</span></div>
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Subtotal</span>
            <span className="text-red-600">{formatCurrency(totalFixedExpenses)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Variable */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Despesas Variáveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Alimentação</span>
            <div className="flex items-center gap-2">
              <span>{formatCurrency(data.expenses.variable.food)}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addExpense('variable', 'food', 50)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Transporte</span>
            <div className="flex items-center gap-2">
              <span>{formatCurrency(data.expenses.variable.transport)}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addExpense('variable', 'transport', 30)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Saúde</span>
            <div className="flex items-center gap-2">
              <span>{formatCurrency(data.expenses.variable.health)}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addExpense('variable', 'health', 100)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCards = () => (
    <div className="space-y-3">
      <Card className={cn(
        cardToIncomeRatio > 40 && "border-red-500/50"
      )}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Uso Total de Cartões
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex justify-between mb-2">
            <span className="text-sm">{formatCurrency(totalCardUsage)}</span>
            <span className={cn(
              "text-sm font-medium",
              cardToIncomeRatio > 40 ? "text-red-500" : "text-green-500"
            )}>
              {cardToIncomeRatio.toFixed(0)}% da receita
            </span>
          </div>
          <Progress value={cardToIncomeRatio} className="h-2" />
        </CardContent>
      </Card>

      {data.cards.map((card, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-sm">{card.name}</p>
                <p className="text-xs text-muted-foreground">Vence dia {card.dueDate}</p>
              </div>
              <Badge variant={card.used / card.limit > 0.7 ? "destructive" : "secondary"}>
                {((card.used / card.limit) * 100).toFixed(0)}%
              </Badge>
            </div>
            <Progress value={(card.used / card.limit) * 100} className="h-1.5 mb-1" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(card.used)}</span>
              <span>{formatCurrency(card.limit)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Economia Mensal
          </CardTitle>
          <CardDescription className="text-xs">Meta: {data.goals.monthlyEconomy.target}% da receita</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Progress value={(data.goals.monthlyEconomy.current / data.goals.monthlyEconomy.target) * 100} className="h-2 mb-1" />
          <p className="text-xs text-right">{data.goals.monthlyEconomy.current}% / {data.goals.monthlyEconomy.target}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reserva de Emergência
          </CardTitle>
          <CardDescription className="text-xs">Meta: 6 meses de despesas</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Progress value={(data.goals.emergencyFund.current / data.goals.emergencyFund.target) * 100} className="h-2 mb-1" />
          <div className="flex justify-between text-xs">
            <span className="text-green-600">{formatCurrency(data.goals.emergencyFund.current)}</span>
            <span className="text-muted-foreground">{formatCurrency(data.goals.emergencyFund.target)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Meta de Viagem
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Progress value={(data.goals.travel.current / data.goals.travel.target) * 100} className="h-2 mb-1" />
          <div className="flex justify-between text-xs">
            <span className="text-green-600">{formatCurrency(data.goals.travel.current)}</span>
            <span className="text-muted-foreground">{formatCurrency(data.goals.travel.target)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    if (state === 'CANDIDATE') {
      return (
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Gestão Financeira Familiar</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Sistema completo para controle de receitas, despesas, cartões e metas
            </p>
          </div>
          <Button size="lg" onClick={handleStart} className="gap-2">
            <Play className="h-4 w-4" />
            Iniciar Sistema
          </Button>
        </div>
      );
    }

    if (state === 'ERROR') {
      return (
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-destructive">Alerta Crítico!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Situação financeira requer atenção imediata
            </p>
          </div>
          {notifications.map((n, i) => (
            <p key={i} className="text-sm">{n}</p>
          ))}
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Recomeçar
          </Button>
        </div>
      );
    }

    if (state === 'DONE') {
      return (
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-600">Mês Fechado!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Resumo financeiro do período
            </p>
          </div>
          <div className="text-left max-w-xs mx-auto space-y-2">
            <div className="flex justify-between"><span>Receita:</span><span className="text-green-600 font-medium">{formatCurrency(totalIncome)}</span></div>
            <div className="flex justify-between"><span>Despesas:</span><span className="text-red-600 font-medium">{formatCurrency(totalExpenses)}</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Saldo:</span><span className={balance >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(balance)}</span></div>
          </div>
          <Button onClick={handleReset} variant="ghost" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Novo Mês
          </Button>
        </div>
      );
    }

    // RUNNING or COOLING
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger value="dashboard" className="text-xs px-1 py-1.5">
            <PieChart className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="income" className="text-xs px-1 py-1.5">
            <TrendingUp className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs px-1 py-1.5">
            <TrendingDown className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="cards" className="text-xs px-1 py-1.5">
            <CreditCard className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs px-1 py-1.5">
            <Target className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-3">{renderDashboard()}</TabsContent>
        <TabsContent value="income" className="mt-3">{renderIncome()}</TabsContent>
        <TabsContent value="expenses" className="mt-3">{renderExpenses()}</TabsContent>
        <TabsContent value="cards" className="mt-3">{renderCards()}</TabsContent>
        <TabsContent value="goals" className="mt-3">{renderGoals()}</TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <StateIndicator state={state} size="sm" />
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Device Frame */}
      <div className={cn(
        "mx-auto bg-background border-4 border-foreground/20 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300",
        viewMode === 'mobile' ? 'w-[360px]' : 'w-full max-w-2xl'
      )}>
        {viewMode === 'mobile' && (
          <div className="h-6 bg-foreground/5 flex items-center justify-center">
            <div className="w-16 h-1 bg-foreground/20 rounded-full" />
          </div>
        )}

        <div 
          className="bg-background min-h-[500px] p-4 overflow-auto max-h-[600px]"
          style={{ opacity: frictionOpacity }}
        >
          {friction > 0 && (
            <div className="mb-4">
              <FrictionMeter friction={friction} size="sm" />
            </div>
          )}
          {renderContent()}
        </div>

        {viewMode === 'mobile' && (
          <div className="h-5 bg-foreground/5 flex items-center justify-center">
            <div className="w-24 h-1 bg-foreground/20 rounded-full" />
          </div>
        )}
      </div>

      {/* Debug */}
      <div className="text-xs text-muted-foreground text-center space-x-4">
        <span>Estado: <code className="bg-muted px-1 rounded">{state}</code></span>
        <span>Fricção: <code className="bg-muted px-1 rounded">{(friction * 100).toFixed(0)}%</code></span>
        <span>Saldo: <code className="bg-muted px-1 rounded">{formatCurrency(balance)}</code></span>
      </div>
    </div>
  );
}
