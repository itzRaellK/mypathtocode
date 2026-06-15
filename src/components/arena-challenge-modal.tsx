"use client";

import { RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { generateArenaChallenge } from "@/app/(platform)/practice/actions";
import { AsyncActionButton } from "@/components/async-action-button";
import { arenaModes } from "@/lib/arena";

export function ArenaChallengeModal({ activeMode, completed }: { activeMode: string; completed: boolean }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <button className="button button-secondary" type="button" onClick={() => setOpen(true)}>
      <RotateCcw size={14} /> {completed ? "Próximo desafio" : "Gerar outro desafio"}
    </button>
    {open && <div className="arena-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <div className="arena-challenge-modal panel" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="arena-modal-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span className="eyebrow">ARENA INFINITA</span><h2 id="arena-modal-title">Escolha o próximo desafio</h2><p>{completed ? "Você venceu o desafio atual. Escolha como deseja continuar treinando." : "Gerar outro desafio arquivará o atual, mas seu rascunho continuará salvo."}</p></div>
          <button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={18} /></button>
        </header>
        <section className="arena-modal-modes">
          {arenaModes.map((mode) => <article className={`arena-modal-mode ${activeMode === mode.key ? "arena-modal-mode-active" : ""}`} key={mode.key}>
            <div><Sparkles size={17} /><span>{mode.key === "adaptive" ? "RECOMENDADO" : "MODO"}</span></div>
            <h3>{mode.title}</h3><p>{mode.description}</p>
            <AsyncActionButton action={generateArenaChallenge.bind(null, mode.key)} label="Escolher modo" pendingLabel="Criando desafio..." className="button button-secondary" onSuccess={() => setOpen(false)} />
          </article>)}
        </section>
        <footer><button className="text-button" type="button" onClick={() => setOpen(false)}>Cancelar</button></footer>
      </div>
    </div>}
  </>;
}
