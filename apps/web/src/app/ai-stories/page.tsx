import { AiStoryGeneratorPanel } from "@/components/dbx/AiStoryGeneratorPanel";
import { DbxVisualShell } from "@/components/dbx/DbxVisualShell";

export default function AiStoriesPage() {
  return (
    <DbxVisualShell title="AI Stories" description="Explore dBaronX stories and create customer-safe community experiences.">
      <AiStoryGeneratorPanel compact />
    </DbxVisualShell>
  );
}
