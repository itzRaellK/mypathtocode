"use client";

import { FormEvent, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import type { ReferenceCategory, ReferenceEntry } from "@/lib/reference";
import { ReferenceEntryCard } from "@/components/reference-entry-card";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function LibraryBrowser({
  entries,
  categories,
  initialQuery = "",
  initialCategory = "all",
}: {
  entries: ReferenceEntry[];
  categories: ReferenceCategory[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const normalizedQuery = normalize(query.trim());

  const categoryCounts = useMemo(() => categories.reduce<Record<ReferenceCategory, number>>((counts, item) => {
    counts[item] = entries.filter((entry) => entry.category === item).length;
    return counts;
  }, {} as Record<ReferenceCategory, number>), [categories, entries]);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const matchesCategory = category === "all" || entry.category === category;
    const haystack = normalize([
      entry.title,
      entry.category,
      entry.summary,
      entry.syntax,
      entry.returns ?? "",
      entry.useWhen,
      entry.example,
      ...entry.pitfalls,
      ...entry.related,
    ].join(" "));
    return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
  }), [category, entries, normalizedQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  return (
    <>
      <section className="panel library-command-bar">
        <form className="library-search" onSubmit={submit}>
          <label>
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por UPROPERTY, FVector, overlap, Tick..." />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Todas as categorias</option>
            {categories.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
          <button className="button button-primary" type="submit"><Search size={14} /> Buscar</button>
        </form>
        {(query || category !== "all") && <button className="library-clear-link" type="button" onClick={clearFilters}>Limpar filtros <ExternalLink size={12} /></button>}
      </section>

      <section className="library-layout">
        <aside className="library-category-rail">
          <button className={category === "all" ? "library-category-active" : ""} type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
            <span>Tudo</span>
            <strong>{entries.length}</strong>
          </button>
          {categories.map((item) => <button className={category === item ? "library-category-active" : ""} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>
            <span>{item}</span>
            <strong>{categoryCounts[item]}</strong>
          </button>)}
        </aside>

        <div className="library-results">
          <header className="library-results-header">
            <div>
              <span className="eyebrow">REFERÊNCIAS</span>
              <h2>{filteredEntries.length} fichas encontradas</h2>
            </div>
          </header>

          <div className="library-entry-list">
            {filteredEntries.map((entry) => <ReferenceEntryCard entry={entry} key={entry.slug} />)}
          </div>

          {filteredEntries.length === 0 && <div className="empty-state panel library-empty">
            <Search size={24} />
            <h3>Nada encontrado ainda</h3>
            <p>Tente outro nome, categoria ou conceito.</p>
            <button className="button button-secondary" type="button" onClick={clearFilters}>Ver biblioteca completa</button>
          </div>}
        </div>
      </section>
    </>
  );
}
