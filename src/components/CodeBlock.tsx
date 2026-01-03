import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  title?: string;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export function CodeBlock({ code, title, validation }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar código");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-[#1e1e1e] overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-border">
          <span className="text-sm font-medium text-gray-300">{title}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-gray-400 hover:text-white hover:bg-[#3d3d3d]"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-gray-100 whitespace-pre-wrap">
          {code}
        </code>
      </pre>

      {validation && (
        <div className="px-4 py-3 border-t border-border bg-[#2d2d2d]">
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <span className="text-sm text-green-400 flex items-center gap-1">
                ✅ Código válido ({8 - validation.errors.length}/8 regras aprovadas)
              </span>
            ) : (
              <span className="text-sm text-red-400 flex items-center gap-1">
                ❌ {validation.errors.length} erro(s) encontrado(s)
              </span>
            )}
          </div>
          {validation.errors.length > 0 && (
            <ul className="mt-2 text-xs text-red-300 space-y-1">
              {validation.errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <ul className="mt-2 text-xs text-yellow-300 space-y-1">
              {validation.warnings.map((warning, i) => (
                <li key={i}>⚠️ {warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}