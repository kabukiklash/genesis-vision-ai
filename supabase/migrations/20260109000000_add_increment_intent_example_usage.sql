-- Função RPC para incrementar usage_count ao clicar nos exemplos rápidos

CREATE OR REPLACE FUNCTION public.increment_intent_example_usage(example_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.intent_examples
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE id = example_id;
END;
$$;
