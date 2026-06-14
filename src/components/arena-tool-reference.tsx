"use client";

import { CircleHelp } from "lucide-react";
import { createPortal } from "react-dom";
import { useState } from "react";
import type { ArenaTool } from "@/lib/arena";

type TooltipState = {
  tool: ArenaTool;
  top: number;
  left: number;
} | null;

export function ArenaToolReference({ tools }: { tools: ArenaTool[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  function showTooltip(tool: ArenaTool, button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    const width = Math.min(420, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const estimatedHeight = 280;
    const top = rect.bottom + estimatedHeight > window.innerHeight
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : rect.bottom + 8;
    setTooltip({ tool, top, left });
  }

  return <>
    <div className="arena-tool-list">
      {tools.map((tool) => <article className="arena-tool-item" key={`${tool.name}-${tool.purpose}`}>
        <div><code>{tool.name}</code><span>{tool.purpose}</span></div>
        <button
          className="arena-tool-help-button"
          type="button"
          aria-label={`Ver exemplos de ${tool.name}`}
          onBlur={() => setTooltip(null)}
          onFocus={(event) => showTooltip(tool, event.currentTarget)}
          onMouseEnter={(event) => showTooltip(tool, event.currentTarget)}
          onMouseLeave={() => setTooltip(null)}
        ><CircleHelp size={15} /></button>
      </article>)}
    </div>
    {tooltip && createPortal(<aside className="arena-tool-tooltip" role="tooltip" style={{ top: tooltip.top, left: tooltip.left }}>
      <strong>{tooltip.tool.name}</strong>
      <p>{tooltip.tool.usage}</p>
      {tooltip.tool.examples?.length
        ? <><span>EXEMPLOS DE USO</span>{tooltip.tool.examples.slice(0, 2).map((example) => <pre key={example}><code>{example}</code></pre>)}</>
        : <small>Exemplos ainda não gerados para este recurso.</small>}
    </aside>, document.body)}
  </>;
}
