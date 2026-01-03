import { supabase } from "@/integrations/supabase/client";

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

export async function processIntent(intent: string): Promise<ProcessIntentResponse> {
  const { data, error } = await supabase.functions.invoke('process-intent', {
    body: { intent }
  });

  if (error) {
    throw new Error(error.message || 'Failed to process intent');
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