import { AiStoryGeneratorPanel } from "@/components/dbx/AiStoryGeneratorPanel";
import { DbxVisualShell } from "@/components/dbx/DbxVisualShell";

export default function AiStoriesCreatePage() {
  return (
    <DbxVisualShell title="Create AI Story" description="Generate a dBaronX story draft through the secure Rocket story endpoint.">
      <AiStoryGeneratorPanel />
    </DbxVisualShell>
  );
}
