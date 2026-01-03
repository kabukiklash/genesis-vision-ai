import { DynamicAppPreview } from './preview/DynamicAppPreview';

interface GeneratedAppPreviewProps {
  vibeCode: string;
  intent: string;
}

export function GeneratedAppPreview({ vibeCode, intent }: GeneratedAppPreviewProps) {
  return <DynamicAppPreview intent={intent} vibeCode={vibeCode} />;
}
