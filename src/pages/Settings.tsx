import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LLMProvider {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  model: string;
  is_active: boolean;
}

const PRESET_PROVIDERS = [
  { name: 'OpenAI', api_url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  { name: 'DeepSeek', api_url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { name: 'Groq', api_url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
  { name: 'Together AI', api_url: 'https://api.together.xyz/v1/chat/completions', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { name: 'Ollama (Local)', api_url: 'http://localhost:11434/v1/chat/completions', model: 'llama3' },
  { name: 'LM Studio (Local)', api_url: 'http://localhost:1234/v1/chat/completions', model: 'local-model' },
];

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newProvider, setNewProvider] = useState({ name: '', api_url: '', api_key: '', model: '' });
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    if (user) loadProviders();
  }, [user]);

  async function loadProviders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('llm_providers')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar provedores');
      console.error(error);
    } else {
      setProviders((data as unknown as LLMProvider[]) || []);
    }
    setLoading(false);
  }

  async function addProvider(preset?: typeof PRESET_PROVIDERS[0]) {
    const provider = preset || newProvider;
    if (!provider.name || !provider.api_url || !provider.model) {
      toast.error('Preencha nome, URL e modelo');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('llm_providers').insert({
      user_id: user!.id,
      name: provider.name,
      api_url: provider.api_url,
      api_key: preset ? '' : newProvider.api_key,
      model: provider.model,
      is_active: false,
    } as any);

    if (error) {
      toast.error('Erro ao adicionar provedor');
      console.error(error);
    } else {
      toast.success(`${provider.name} adicionado!`);
      setNewProvider({ name: '', api_url: '', api_key: '', model: '' });
      setShowNewForm(false);
      await loadProviders();
    }
    setSaving(false);
  }

  async function toggleActive(provider: LLMProvider) {
    // If activating, deactivate all others first
    if (!provider.is_active) {
      // Deactivate all
      for (const p of providers) {
        if (p.is_active) {
          await supabase.from('llm_providers').update({ is_active: false } as any).eq('id', p.id);
        }
      }
    }

    const { error } = await supabase
      .from('llm_providers')
      .update({ is_active: !provider.is_active } as any)
      .eq('id', provider.id);

    if (error) {
      toast.error('Erro ao atualizar');
    } else {
      toast.success(provider.is_active ? 'Provedor desativado' : `${provider.name} ativado!`);
      await loadProviders();
    }
  }

  async function updateProvider(id: string, field: string, value: string) {
    const { error } = await supabase
      .from('llm_providers')
      .update({ [field]: value } as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar');
    } else {
      setProviders(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    }
  }

  async function deleteProvider(id: string) {
    const { error } = await supabase.from('llm_providers').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover');
    } else {
      toast.success('Provedor removido');
      setProviders(prev => prev.filter(p => p.id !== id));
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">Faça login para acessar as configurações.</p>
            <Button className="mt-4 w-full" onClick={() => navigate('/')}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground text-sm">Gerencie seus provedores de LLM</p>
          </div>
        </div>

        {/* Info card */}
        <Card className="mb-6 border-primary/20 bg-accent/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-accent-foreground">
              <strong>Como funciona:</strong> Cadastre provedores compatíveis com a API OpenAI (endpoint <code>/v1/chat/completions</code>). 
              Ative um provedor para que ele seja usado ao invés do Lovable AI, economizando seus tokens.
            </p>
          </CardContent>
        </Card>

        {/* Current providers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Seus Provedores</CardTitle>
            <CardDescription>
              {providers.some(p => p.is_active)
                ? <Badge variant="default">Usando provedor customizado</Badge>
                : <Badge variant="secondary">Usando Lovable AI (padrão)</Badge>
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : providers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum provedor cadastrado ainda.</p>
            ) : (
              providers.map(provider => (
                <div key={provider.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={provider.is_active}
                        onCheckedChange={() => toggleActive(provider)}
                      />
                      <span className="font-medium text-foreground">{provider.name}</span>
                      {provider.is_active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteProvider(provider.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">URL da API</Label>
                      <Input
                        value={provider.api_url}
                        onChange={e => updateProvider(provider.id, 'api_url', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Modelo</Label>
                      <Input
                        value={provider.model}
                        onChange={e => updateProvider(provider.id, 'model', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          value={provider.api_key}
                          onChange={e => updateProvider(provider.id, 'api_key', e.target.value)}
                          placeholder="sk-..."
                          className="text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        >
                          {showKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick add presets */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Adicionar Provedor</CardTitle>
            <CardDescription>Escolha um preset ou configure manualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {PRESET_PROVIDERS.map(preset => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => addProvider(preset)}
                  disabled={saving}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {preset.name}
                </Button>
              ))}
            </div>

            {!showNewForm ? (
              <Button variant="secondary" size="sm" onClick={() => setShowNewForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Provedor Customizado
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={newProvider.name}
                      onChange={e => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Kimi, Claude..."
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Modelo</Label>
                    <Input
                      value={newProvider.model}
                      onChange={e => setNewProvider(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Ex: gpt-4o, deepseek-chat"
                      className="text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">URL da API (compatível OpenAI)</Label>
                    <Input
                      value={newProvider.api_url}
                      onChange={e => setNewProvider(prev => ({ ...prev, api_url: e.target.value }))}
                      placeholder="https://api.exemplo.com/v1/chat/completions"
                      className="text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">API Key</Label>
                    <Input
                      value={newProvider.api_key}
                      onChange={e => setNewProvider(prev => ({ ...prev, api_key: e.target.value }))}
                      type="password"
                      placeholder="sk-..."
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addProvider()} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Adicionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
