"use client";

import { FormEvent, useState } from "react";

import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

const storyConcepts = [
  { id: "starlight-children", title: "Starlight Children", prompt: "Write a compelling opening chapter for Starlight Children about brave children following warm starlight through a hopeful hidden world.", tone: "Whimsical, warm, hopeful", genre: "children" },
  { id: "the-last-dragon", title: "The Last Dragon", prompt: "Write a cinematic opening chapter for The Last Dragon about a final ancient dragon and the child sworn to protect it.", tone: "Epic, heartfelt, adventurous", genre: "fantasy" },
  { id: "the-solar-forest", title: "The Solar Forest", prompt: "Write a luminous opening chapter for The Solar Forest where trees drink sunlight and guard a secret civilization.", tone: "Wonder-filled, bright, mysterious", genre: "science fiction" },
  { id: "quantum-dreams", title: "Quantum Dreams", prompt: "Write a mind-bending opening chapter for Quantum Dreams about a dreamer who wakes inside alternate futures.", tone: "Cinematic, surreal, hopeful", genre: "science fiction" },
  { id: "midnight-protocol", title: "Midnight Protocol", prompt: "Write a tense opening chapter for Midnight Protocol about a hidden signal that activates at midnight.", tone: "Suspenseful, sleek, urgent", genre: "thriller" },
  { id: "the-merchants-secret", title: "The Merchant’s Secret", prompt: "Write an intriguing opening chapter for The Merchant’s Secret about a marketplace trader guarding a magical debt.", tone: "Warm, mysterious, adventurous", genre: "adventure" },
] as const;

const errorMessages: Record<string, string> = {
  ai_provider_missing: "ai_provider_missing: Provider not configured. Please contact support so AI generation can be enabled.",
  provider_failed: "provider_failed: The AI provider could not generate this story. Try a clearer prompt or retry.",
  fastapi_route_missing: "fastapi_route_missing: The AI Stories generation route is not deployed yet. Please contact support.",
  fastapi_unavailable: "fastapi_unavailable: Generation service unavailable. Please retry in a moment.",
  validation_failed: "validation_failed: Request validation failed. Please check the prompt, length, and tone.",
  rate_limited: "Generation is rate limited. Please wait a moment and retry.",
  persistence_failed: "persistence_failed: Persistence failed but the story may have generated. Copy any visible story before leaving.",
};

export function AiStoryGeneratorPanel({ compact = false }: { compact?: boolean }) {
  const [conceptId, setConceptId] = useState<string>(storyConcepts[0].id);
  const selectedConcept = storyConcepts.find((concept) => concept.id === conceptId) || storyConcepts[0];
  const [title, setTitle] = useState<string>(selectedConcept.title);
  const [prompt, setPrompt] = useState<string>(selectedConcept.prompt);
  const [genre, setGenre] = useState<string>(selectedConcept.genre);
  const [length, setLength] = useState("medium");
  const [tone, setTone] = useState<string>(selectedConcept.tone);
  const [audience, setAudience] = useState("general");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<Record<string, string> | null>(null);

  function selectConcept(nextConceptId: string) {
    const next = storyConcepts.find((concept) => concept.id === nextConceptId) || storyConcepts[0];
    setConceptId(next.id);
    setTitle(next.title);
    setPrompt(next.prompt);
    setTone(next.tone);
    setGenre(next.genre);
  }

  async function submit(payload: Record<string, string>) {
    setIsLoading(true);
    setStatus("Generating story…");
    setContent("");
    setSaved(false);
    setLastError(null);
    try {
      const response = await fetch("/api/ai-stories", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!data?.success) {
        const code = typeof data?.code === "string" ? data.code : "fastapi_unavailable";
        setLastError(code);
        const safeMessage = errorMessages[code] || data?.message || "Story generation could not complete. Please retry.";
        setStatus(`${code}: ${safeMessage}`);
        return;
      }
      const generatedContent = typeof data.content === "string" ? data.content : "";
      setContent(generatedContent);
      setSaved(data.saved === true);
      const persistenceWarning = data.saved !== true ? " Story generated, but saving is not confirmed." : " Story generated and saved.";
      const fallbackNote = data.fallbackUsed ? " Provider fallback was used." : "";
      setStatus(generatedContent ? `${persistenceWarning}${fallbackNote}`.trim() : "The provider returned no story text. Please retry.");
    } catch {
      setLastError("fastapi_unavailable");
      setStatus(errorMessages.fastapi_unavailable);
    } finally {
      setIsLoading(false);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { conceptId, title, prompt, genre, length, tone, audience };
    setLastRequest(payload);
    await submit(payload);
  }

  return (
    <DbxCard>
      <form onSubmit={generate} style={{ display: "grid", gap: 14 }}>
        <label style={labelStyle}>
          Generate
          <select value={conceptId} onChange={(event) => selectConcept(event.target.value)} style={fieldStyle}>
            {storyConcepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.title}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Title<input value={title} onChange={(event) => setTitle(event.target.value)} style={fieldStyle} /></label>
        <label style={{ display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 }}>
          Prompt
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={compact ? 4 : 6} style={fieldStyle} placeholder="Describe the customer story you want to create" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <label style={labelStyle}>Genre<input value={genre} onChange={(event) => setGenre(event.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Length<select value={length} onChange={(event) => setLength(event.target.value)} style={fieldStyle}><option value="short">Short</option><option value="medium">Medium (~1000 words)</option><option value="long">Long</option></select></label>
          <label style={labelStyle}>Tone<input value={tone} onChange={(event) => setTone(event.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Audience<input value={audience} onChange={(event) => setAudience(event.target.value)} style={fieldStyle} /></label>
        </div>
        <button type="submit" disabled={isLoading} style={{ ...dbxButtonStyle, cursor: isLoading ? "wait" : "pointer", border: 0, opacity: isLoading ? 0.72 : 1 }}>{isLoading ? "Generating…" : "Generate story"}</button>
      </form>
      {status ? <p role="status" style={{ color: lastError ? "#fecaca" : "#fed7aa", lineHeight: 1.6 }}>{status}</p> : null}
      {lastError && lastRequest ? <button type="button" onClick={() => submit(lastRequest)} style={{ ...dbxButtonStyle, border: 0, marginTop: 8 }}>Retry generation</button> : null}
      {!saved && content ? <p style={{ color: "#fdba74" }}>Generated draft is not confirmed saved yet.</p> : null}
      {content ? <article style={{ marginTop: 14, whiteSpace: "pre-wrap", color: "#fff7ed", lineHeight: 1.7 }}>{content}</article> : null}
    </DbxCard>
  );
}

const labelStyle = { display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 } as const;
const fieldStyle = { border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800 } as const;
