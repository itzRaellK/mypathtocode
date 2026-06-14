"use client";

import { useEffect, useState } from "react";

const accents = [
  { id: "green", label: "Verde" },
  { id: "blue", label: "Azul" },
  { id: "purple", label: "Roxo" },
  { id: "orange", label: "Laranja" },
];

function applyAccent(id: string) {
  document.documentElement.dataset.accent = id;
}

export function AccentSwitcher() {
  const [accent, setAccent] = useState("green");

  useEffect(() => {
    const saved = localStorage.getItem("accent") ?? "green";
    applyAccent(saved);
    const frame = requestAnimationFrame(() => setAccent(saved));
    return () => cancelAnimationFrame(frame);
  }, []);

  function selectAccent(id: string) {
    localStorage.setItem("accent", id);
    applyAccent(id);
    setAccent(id);
  }

  return (
    <div className="accent-switcher" aria-label="Cor de destaque">
      {accents.map((item) => (
        <button
          className={`accent-dot accent-${item.id}`}
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-pressed={accent === item.id}
          onClick={() => selectAccent(item.id)}
        />
      ))}
    </div>
  );
}
