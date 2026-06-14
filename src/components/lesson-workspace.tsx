"use client";

import { useState } from "react";
import { Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { evaluateSolution, saveDraft } from "@/app/(platform)/lessons/actions";
import { CodeEditor } from "@/components/code-editor";

type FileData = { path: string; language: string; content: string };

export function LessonWorkspace({ trackId, lessonKey, initialFiles }: { trackId: string; lessonKey: string; initialFiles: FileData[] }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [active, setActive] = useState(0);
  const [action, setAction] = useState<"saving" | "evaluating" | null>(null);
  const [message, setMessage] = useState("");
  const file = files[active];
  if (!file) return null;

  async function handleSave() {
    setAction("saving");
    try {
      const result = await saveDraft(trackId, lessonKey, files);
      setMessage(result.message);
    } finally {
      setAction(null);
    }
  }

  async function handleEvaluate() {
    setAction("evaluating");
    try {
      const result = await evaluateSolution(trackId, lessonKey, files);
      setMessage(result.message);
      if (result.ok) router.refresh();
    } finally {
      setAction(null);
    }
  }

  return (
    <section className="code-workspace panel">
      <header><div className="code-tabs">{files.map((item, index) => <button className={active === index ? "code-tab-active" : ""} type="button" key={item.path} onClick={() => setActive(index)}>{item.path}</button>)}</div>
        <div className="code-actions">
          <button className="text-button" type="button" disabled={action !== null} onClick={handleSave}><Save size={13} /> {action === "saving" ? "Salvando..." : "Salvar rascunho"}</button>
          <button className="button button-primary compact-button" type="button" disabled={action !== null} onClick={handleEvaluate}><Send size={13} /> {action === "evaluating" ? "Avaliando..." : "Enviar para IA"}</button>
        </div></header>
      <CodeEditor modelId={`lessons/${trackId}/${lessonKey}`} path={file.path} language={file.language} value={file.content} onChange={(content) => setFiles((current) => current.map((item, index) => index === active ? { ...item, content } : item))} />
      {message && <small>{message}</small>}
    </section>
  );
}
