import { AiStoryGeneratorPanel } from "@/components/dbx/AiStoryGeneratorPanel";
import { DbxVisualShell } from "@/components/dbx/DbxVisualShell";

export default function AiStoryGeneratorPage() {
  return (
    <DbxVisualShell title="AI Story Generator" description="Generate customer-ready dBaronX story text safely through the AI service.">
      <AiStoryGeneratorPanel />
    </DbxVisualShell>
  );
}
