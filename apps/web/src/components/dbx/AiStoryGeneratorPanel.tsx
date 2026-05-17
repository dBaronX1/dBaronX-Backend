"use client";

import { FormEvent, useState } from "react";

import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export function AiStoryGeneratorPanel({ compact = false }: { compact?: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("brand");
  const [length, setLength] = useState("short");
  const [tone, setTone] = useState("inspiring");
  const [isSeries, setIsSeries] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(false);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Generating story…");
    setContent("");
    setSaved(false);
    try {
      const response = await fetch("/api/ai-stories", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ prompt, genre, length, tone, isSeries, is_series: isSeries }),
      });
      const data = await response.json().catch(() => null);
      const generatedContent = data && typeof data.content === "string" ? data.content : "";
      setContent(generatedContent);
      setSaved(data?.saved === true);
      setStatus(generatedContent ? (!data.saved ? "Story generated. Save from your signed-in workspace when ready." : "Story generated and saved.") : "We could not generate a story right now. Please try again shortly.");
    } catch {
      setStatus("We could not generate a story right now. Please try again shortly.");
    }
  }

  return (
    <DbxCard>
      <form onSubmit={generate} style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 }}>
          Prompt
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={compact ? 4 : 6} style={fieldStyle} placeholder="Describe the customer story you want to create" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <label style={labelStyle}>Genre<input value={genre} onChange={(event) => setGenre(event.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Length<select value={length} onChange={(event) => setLength(event.target.value)} style={fieldStyle}><option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option></select></label>
          <label style={labelStyle}>Tone<input value={tone} onChange={(event) => setTone(event.target.value)} style={fieldStyle} /></label>
        </div>
        <label style={{ color: "#fed7aa", fontWeight: 800 }}><input type="checkbox" checked={isSeries} onChange={(event) => setIsSeries(event.target.checked)} /> Series story</label>
        <button type="submit" style={{ ...dbxButtonStyle, cursor: "pointer", border: 0 }}>Generate story</button>
      </form>
      {status ? <p role="status" style={{ color: "#fed7aa", lineHeight: 1.6 }}>{status}</p> : null}
      {!saved && content ? <p style={{ color: "#fdba74" }}>Generated draft is not saved yet.</p> : null}
      {content ? <div style={{ marginTop: 14, whiteSpace: "pre-wrap", color: "#fff7ed", lineHeight: 1.7 }}>{content}</div> : null}
    </DbxCard>
  );
}

const labelStyle = { display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 } as const;
const fieldStyle = { border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800 } as const;
