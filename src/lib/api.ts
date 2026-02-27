import { supabase } from "@/integrations/supabase/client";
import { shouldUseMockData } from "@/lib/env";

export interface Generation {
  personaId: string;
  personaName: string;
  code: string;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  timestamp: string;
}

export interface Evaluation {
  proposalIndex: number;
  scores: {
    clareza: number;
    completude: number;
    elegancia: number;
    robustez: number;
  };
  totalScore: number;
  strengths: string[];
  weaknesses: string[];
}

export interface Stage2Results {
  evaluations: Evaluation[];
  ranking: number[];
  recommendation: string;
}

export interface Stage3Results {
  finalCode: string;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  chairman: string;
  reasoning: string;
  timestamp: string;
}

export interface ProcessIntentResponse {
  conversationId: string;
  stage1: Generation[];
  stage2: Stage2Results;
  stage3: Stage3Results;
}

export interface ProcessIntentOptions {
  skipCouncil?: boolean;
}

export async function processIntent(intent: string, options?: ProcessIntentOptions): Promise<ProcessIntentResponse> {
  // Get session to include auth token
  const { data: { session } } = await supabase.auth.getSession();
  
  const { data, error } = await supabase.functions.invoke('process-intent', {
    body: { intent, skipCouncil: options?.skipCouncil ?? false },
    headers: session?.access_token ? {
      Authorization: `Bearer ${session.access_token}`
    } : {}
  });

  if (error) {
    // Incluir mensagem do body da Edge Function quando disponível (ex.: 500 com { error: "..." })
    const msg = (data as { error?: string })?.error || error.message || 'Failed to process intent';
    throw new Error(msg);
  }

  return data as ProcessIntentResponse;
}

export async function getConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return data;
}

export async function getConversationResults(conversationId: string) {
  const { data, error } = await supabase
    .from('council_results')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('stage', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

// -------- Financial data (Fase 2) --------

export interface FinancialData {
  id?: string;
  conversation_id?: string | null;
  income: Record<string, number>;
  expenses: {
    fixed: Record<string, number>;
    variable: Record<string, number>;
    occasional: Record<string, number>;
  };
  cards: {
    name: string;
    limit: number;
    used: number;
    dueDate: number;
  }[];
  goals: Record<string, { target: number; current: number }>;
}

// Mock reutilizando a estrutura existente do FinancialAppPreview
export const defaultFinancialMock: FinancialData = {
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
    { name: "Pessoa 1 - Principal", limit: 8000, used: 2400, dueDate: 10 },
    { name: "Pessoa 2 - Principal", limit: 5000, used: 1800, dueDate: 15 },
    { name: "Adicional", limit: 3000, used: 600, dueDate: 20 },
  ],
  goals: {
    monthlyEconomy: { target: 20, current: 15 },
    emergencyFund: { target: 41700, current: 28000 },
    travel: { target: 15000, current: 8500 },
  },
};

export async function getFinancialData(
  conversationId?: string
): Promise<FinancialData> {
  if (shouldUseMockData || !conversationId) {
    return defaultFinancialMock;
  }

  const { data, error } = await supabase
    .from("financial_data")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Em caso de erro, fallback para mock para não quebrar UI
    console.error("Error loading financial_data:", error);
    return defaultFinancialMock;
  }

  if (!data) {
    return defaultFinancialMock;
  }

  return {
    id: data.id,
    conversation_id: data.conversation_id,
    income: data.income,
    expenses: data.expenses,
    cards: data.cards,
    goals: data.goals,
  } as FinancialData;
}

export async function upsertFinancialData(
  payload: FinancialData & { conversation_id?: string | null }
): Promise<void> {
  if (shouldUseMockData) {
    // Em modo mock, não persiste em lugar nenhum
    return;
  }

  const { error } = await supabase.from("financial_data").upsert(
    {
      id: payload.id,
      conversation_id: payload.conversation_id ?? null,
      income: payload.income,
      expenses: payload.expenses,
      cards: payload.cards,
      goals: payload.goals,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    console.error("Error upserting financial_data:", error);
    throw error;
  }
}

// -------- App state snapshots (Fase 2) --------

export interface AppStateSnapshot {
  id?: string;
  conversation_id?: string | null;
  state_data: Record<string, unknown>;
  created_at?: string;
}

export async function saveAppStateSnapshot(
  snapshot: AppStateSnapshot
): Promise<void> {
  if (shouldUseMockData) return;

  const { error } = await supabase.from("app_states").insert({
    conversation_id: snapshot.conversation_id ?? null,
    state_data: snapshot.state_data,
  });

  if (error) {
    console.error("Error saving app state snapshot:", error);
  }
}

// -------- Intent Examples (Fase 4) --------

export interface IntentExample {
  id: string;
  title: string;
  description: string | null;
  intent_text: string;
  category: string | null;
  usage_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export async function getIntentExamples(options?: {
  category?: string;
  featured?: boolean;
  limit?: number;
}): Promise<IntentExample[]> {
  try {
    let query = supabase
      .from('intent_examples')
      .select('*')
      .order('usage_count', { ascending: false });

    if (options?.featured) {
      query = query.eq('is_featured', true);
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      // Se a tabela não existir ainda (desenvolvimento), usar fallback
      if (
        error.code === 'PGRST116' ||
        error.message?.includes('does not exist')
      ) {
        console.info(
          'ℹ️ Intent examples table not found, using fallback examples'
        );
        return []; // OK - tabela ainda não existe em desenvolvimento
      }

      // Para OUTROS erros, logar mas não quebrar a aplicação
      console.warn('⚠️ Error fetching intent examples:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return [];
    }

    return data || [];
  } catch (error) {
    // Erro não esperado - logar bem
    console.error('❌ Unexpected error in getIntentExamples:', error);
    return [];
  }
}

export async function incrementIntentExampleUsage(exampleId: string): Promise<void> {
  try {
    // Tentar incrementar via RPC (se existir)
    const { error: rpcError } = await supabase.rpc('increment_intent_example_usage', {
      example_id: exampleId
    });

    if (rpcError) {
      // Fallback: update manual
      const { data: current, error: selectError } = await supabase
        .from('intent_examples')
        .select('usage_count')
        .eq('id', exampleId)
        .single();

      if (selectError) {
        console.warn('Could not fetch current usage count:', selectError);
        return; // Falha silenciosamente mas loga
      }

      if (current) {
        const { error: updateError } = await supabase
          .from('intent_examples')
          .update({ usage_count: (current.usage_count || 0) + 1 })
          .eq('id', exampleId);

        if (updateError) {
          console.warn('Could not update usage count:', updateError);
        }
      }
    }
  } catch (error) {
    // Erro inesperado - logar mas não quebrar aplicação
    console.warn('Error incrementing intent example usage:', error);
  }
}