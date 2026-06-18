"use client";

import { AlertTriangle, BookOpenText, Code2, Link2 } from "lucide-react";
import type { ReferenceEntry } from "@/lib/reference";

export function ReferenceEntryCard({ entry }: { entry: ReferenceEntry }) {
  return (
    <article className="panel library-entry-card" id={entry.slug}>
      <header>
        <div>
          <span>{entry.category}</span>
          <h2>{entry.title}</h2>
        </div>
        <a href={`#${entry.slug}`} aria-label={`Link para ${entry.title}`}><Link2 size={15} /></a>
      </header>

      <p>{entry.summary}</p>

      <div className="library-code-grid">
        <div>
          <strong><Code2 size={13} /> Sintaxe</strong>
          <pre><code>{entry.syntax}</code></pre>
        </div>
        <div>
          <strong><BookOpenText size={13} /> Exemplo</strong>
          <pre><code>{entry.example}</code></pre>
        </div>
      </div>

      <div className="library-entry-notes">
        {entry.returns && <div><strong>Retorna</strong><span>{entry.returns}</span></div>}
        <div><strong>Quando usar</strong><span>{entry.useWhen}</span></div>
      </div>

      <div className="library-entry-footer">
        <div className="library-pitfalls">
          <strong><AlertTriangle size={13} /> Cuidado</strong>
          <ul>{entry.pitfalls.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="library-related">
          <strong>Relacionados</strong>
          <div>
            {entry.related.map((slug) => <a href={`#${slug}`} key={slug}>{slug}</a>)}
          </div>
        </div>
      </div>
    </article>
  );
}
