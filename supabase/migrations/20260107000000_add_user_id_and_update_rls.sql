-- Migration: Adicionar user_id e atualizar RLS para autenticação
-- Fase 3: Autenticação e Segurança

-- 1. Adicionar coluna user_id nas tabelas existentes (se ainda não existir)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.council_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Remover políticas públicas antigas (MVP)
DROP POLICY IF EXISTS "Allow public read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public read council_results" ON public.council_results;
DROP POLICY IF EXISTS "Allow public insert council_results" ON public.council_results;

-- 3. Criar políticas baseadas em usuário para conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
ON public.conversations
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Criar políticas baseadas em usuário para council_results
CREATE POLICY "Users can view own council_results"
ON public.council_results
FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() = (SELECT user_id FROM public.conversations WHERE id = conversation_id)
);

CREATE POLICY "Users can create own council_results"
ON public.council_results
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  auth.uid() = (SELECT user_id FROM public.conversations WHERE id = conversation_id)
);

-- 5. Atualizar políticas para financial_data (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_data') THEN
    -- Remover políticas públicas antigas
    DROP POLICY IF EXISTS "Allow public read financial_data" ON public.financial_data;
    DROP POLICY IF EXISTS "Allow public insert financial_data" ON public.financial_data;
    DROP POLICY IF EXISTS "Allow public update financial_data" ON public.financial_data;

    -- Criar políticas baseadas em usuário
    CREATE POLICY "Users can view own financial_data"
    ON public.financial_data
    FOR SELECT
    USING (
      auth.uid() = user_id OR
      (user_id IS NULL AND conversation_id IN (
        SELECT id FROM public.conversations WHERE user_id = auth.uid()
      ))
    );

    CREATE POLICY "Users can create own financial_data"
    ON public.financial_data
    FOR INSERT
    WITH CHECK (
      auth.uid() = COALESCE(user_id, (SELECT user_id FROM public.conversations WHERE id = conversation_id))
    );

    CREATE POLICY "Users can update own financial_data"
    ON public.financial_data
    FOR UPDATE
    USING (
      auth.uid() = user_id OR
      (user_id IS NULL AND conversation_id IN (
        SELECT id FROM public.conversations WHERE user_id = auth.uid()
      ))
    )
    WITH CHECK (
      auth.uid() = COALESCE(user_id, (SELECT user_id FROM public.conversations WHERE id = conversation_id))
    );
  END IF;
END $$;

-- 6. Atualizar políticas para app_states (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_states') THEN
    -- Remover políticas públicas antigas
    DROP POLICY IF EXISTS "Allow public read app_states" ON public.app_states;
    DROP POLICY IF EXISTS "Allow public insert app_states" ON public.app_states;

    -- Criar políticas baseadas em usuário
    CREATE POLICY "Users can view own app_states"
    ON public.app_states
    FOR SELECT
    USING (
      auth.uid() = user_id OR
      (user_id IS NULL AND conversation_id IN (
        SELECT id FROM public.conversations WHERE user_id = auth.uid()
      ))
    );

    CREATE POLICY "Users can create own app_states"
    ON public.app_states
    FOR INSERT
    WITH CHECK (
      auth.uid() = COALESCE(user_id, (SELECT user_id FROM public.conversations WHERE id = conversation_id))
    );
  END IF;
END $$;

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_council_results_user_id ON public.council_results(user_id);

-- 8. Função helper para atualizar user_id automaticamente em conversations
CREATE OR REPLACE FUNCTION public.set_conversation_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se user_id não foi fornecido, usar o usuário autenticado
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para setar user_id automaticamente
DROP TRIGGER IF EXISTS trigger_set_conversation_user_id ON public.conversations;
CREATE TRIGGER trigger_set_conversation_user_id
BEFORE INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_conversation_user_id();

-- 9. Função helper para atualizar user_id automaticamente em council_results
CREATE OR REPLACE FUNCTION public.set_council_result_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se user_id não foi fornecido, buscar da conversation relacionada
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id
    FROM public.conversations
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para setar user_id automaticamente
DROP TRIGGER IF EXISTS trigger_set_council_result_user_id ON public.council_results;
CREATE TRIGGER trigger_set_council_result_user_id
BEFORE INSERT ON public.council_results
FOR EACH ROW
EXECUTE FUNCTION public.set_council_result_user_id();

