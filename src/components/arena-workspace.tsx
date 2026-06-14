"use client";

import { useState } from "react";
import { Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { evaluateArenaChallenge, saveArenaDraft } from "@/app/(platform)/practice/actions";
import type { ArenaFile } from "@/lib/arena";
import { CodeEditor } from "@/components/code-editor";

export function ArenaWorkspace({ challengeId, initialFiles }: { challengeId: string; initialFiles: ArenaFile[] }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [active, setActive] = useState(0);
  const [action, setAction] = useState<"saving" | "evaluating" | null>(null);
  const [message, setMessage] = useState("");
  const file = files[active];
  if (!file) return null;

  async function run(nextAction: "saving" | "evaluating") {
    setAction(nextAction);
    try {
      const result = nextAction === "saving"
        ? await saveArenaDraft(challengeId, files)
        : await evaluateArenaChallenge(challengeId, files);
      setMessage(result.message);
      if (result.ok && nextAction === "evaluating") router.refresh();
    } finally {
      setAction(null);
    }
  }

  return (
    <section className="code-workspace panel arena-workspace">
      <header>
        <div className="code-tabs">{files.map((item, index) => <button className={active === index ? "code-tab-active" : ""} type="button" key={item.path} onClick={() => setActive(index)}>{item.path}</button>)}</div>
        <div className="code-actions">
          <button className="text-button" type="button" disabled={action !== null} onClick={() => run("saving")}><Save size={13} /> {action === "saving" ? "Salvando..." : "Salvar rascunho"}</button>
          <button className="button button-primary compact-button" type="button" disabled={action !== null} onClick={() => run("evaluating")}><Send size={13} /> {action === "evaluating" ? "Avaliando..." : "Enviar para IA"}</button>
        </div>
      </header>
      <CodeEditor modelId={`arena/${challengeId}`} path={file.path} language={file.language} value={file.content} onChange={(content) => setFiles((current) => current.map((item, index) => index === active ? { ...item, content } : item))} />
      {message && <small>{message}</small>}
    </section>
  );
}
