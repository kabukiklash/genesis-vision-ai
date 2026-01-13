import { DynamicAppPreview } from './preview/DynamicAppPreview';

interface GeneratedAppPreviewProps {
  vibeCode: string;
  intent: string;
  conversationId?: string;
}

export function GeneratedAppPreview({ vibeCode, intent, conversationId }: GeneratedAppPreviewProps) {
  return <DynamicAppPreview intent={intent} vibeCode={vibeCode} conversationId={conversationId} />;
}
