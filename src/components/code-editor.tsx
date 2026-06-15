"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useSyncExternalStore } from "react";

const languageAliases: Record<string, string> = {
  c: "c",
  cpp: "cpp",
  cxx: "cpp",
  h: "cpp",
  hpp: "cpp",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  markdown: "markdown",
  md: "markdown",
  plaintext: "plaintext",
  text: "plaintext",
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
};

function editorLanguage(path: string, language: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return languageAliases[language.toLowerCase()] ?? languageAliases[extension] ?? "plaintext";
}

const editorAccents = {
  green: { accent: "63F598", soft: "183824", selection: "1B4A2B" },
  blue: { accent: "68B5FF", soft: "182D40", selection: "1C4263" },
  purple: { accent: "B98AFF", soft: "30233F", selection: "4A3268" },
  orange: { accent: "FFAD62", soft: "3D2B1C", selection: "624125" },
} as const;

type EditorAccent = keyof typeof editorAccents;

function accentSnapshot(): EditorAccent {
  const current = document.documentElement.dataset.accent;
  return current && current in editorAccents ? current as EditorAccent : "green";
}

function subscribeAccent(callback: () => void) {
  window.addEventListener("accentchange", callback);
  return () => window.removeEventListener("accentchange", callback);
}

const beforeMount: BeforeMount = (monaco) => {
  for (const [name, palette] of Object.entries(editorAccents)) {
    monaco.editor.defineTheme(`my-path-code-${name}`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "737A77" },
        { token: "keyword", foreground: palette.accent },
        { token: "number", foreground: "E5B76B" },
        { token: "string", foreground: "B7CBBE" },
        { token: "type", foreground: "82B7E8" },
      ],
      colors: {
        "editor.background": "#08090A",
        "editor.foreground": "#D0D5D2",
        "editorCursor.foreground": `#${palette.accent}`,
        "editor.selectionBackground": `#${palette.selection}`,
        "editor.inactiveSelectionBackground": `#${palette.soft}`,
        "editor.lineHighlightBackground": "#0E1012",
        "editorLineNumber.foreground": "#464B49",
        "editorLineNumber.activeForeground": `#${palette.accent}`,
        "editorIndentGuide.background1": "#202326",
        "editorIndentGuide.activeBackground1": `#${palette.soft}`,
      },
    });
  }
};

const unrealHighlightRules = [
  { pattern: /\b(?:A|U|F|T|I|E)[A-Z][A-Za-z0-9_]*\b/g, className: "monaco-unreal-type" },
  { pattern: /\b[A-Z][A-Za-z0-9_]*(?=\s*\()/g, className: "monaco-unreal-function" },
  { pattern: /#\s*(?:include|define|pragma|if|ifdef|ifndef|endif|else|elif|undef|error|warning)\b/g, className: "monaco-unreal-directive" },
  { pattern: /\b(?:UCLASS|USTRUCT|UENUM|UINTERFACE|UPROPERTY|UFUNCTION|UMETA|GENERATED_BODY|GENERATED_UCLASS_BODY)\b/g, className: "monaco-unreal-macro" },
] as const;

function protectedCppRanges(content: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  let index = 0;

  while (index < content.length) {
    const start = index;
    const current = content[index];
    const next = content[index + 1];

    if (current === "/" && next === "/") {
      index += 2;
      while (index < content.length && content[index] !== "\n") index += 1;
      ranges.push({ start, end: index });
      continue;
    }

    if (current === "/" && next === "*") {
      index += 2;
      while (index < content.length && !(content[index] === "*" && content[index + 1] === "/")) index += 1;
      index = Math.min(index + 2, content.length);
      ranges.push({ start, end: index });
      continue;
    }

    if (current === '"' || current === "'") {
      const quote = current;
      index += 1;
      while (index < content.length) {
        if (content[index] === "\\") {
          index += 2;
          continue;
        }
        if (content[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      ranges.push({ start, end: index });
      continue;
    }

    index += 1;
  }

  return ranges;
}

const editorDidMount: OnMount = (editor, monaco) => {
  const decorations = editor.createDecorationsCollection();

  function updateDecorations() {
    const model = editor.getModel();
    if (!model) return;
    const activeModel = model;
    const content = activeModel.getValue();
    const protectedRanges = protectedCppRanges(content);
    const nextDecorations: Array<{
      range: InstanceType<typeof monaco.Range>;
      options: { inlineClassName: string };
    }> = [];

    function isInsideProtectedToken(offset: number) {
      return protectedRanges.some((range) => offset >= range.start && offset < range.end);
    }

    for (const rule of unrealHighlightRules) {
      for (const match of content.matchAll(rule.pattern)) {
        if (match.index === undefined) continue;
        if (isInsideProtectedToken(match.index)) continue;
        const start = activeModel.getPositionAt(match.index);
        const end = activeModel.getPositionAt(match.index + match[0].length);
        nextDecorations.push({
          range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
          options: { inlineClassName: rule.className },
        });
      }
    }

    decorations.set(nextDecorations);
  }

  updateDecorations();
  const contentSubscription = editor.onDidChangeModelContent(updateDecorations);
  const modelSubscription = editor.onDidChangeModel(updateDecorations);
  editor.onDidDispose(() => {
    contentSubscription.dispose();
    modelSubscription.dispose();
  });
};

export function CodeEditor({
  path,
  modelId,
  language,
  value,
  onChange,
}: {
  path: string;
  modelId: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const accent = useSyncExternalStore(subscribeAccent, accentSnapshot, () => "green");

  return <div className="monaco-shell">
    <Editor
      beforeMount={beforeMount}
      onMount={editorDidMount}
      height="100%"
      language={editorLanguage(path, language)}
      path={`file:///${modelId}/${path}`}
      theme={`my-path-code-${accent}`}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      loading={<div className="monaco-loading">Carregando editor...</div>}
      options={{
        automaticLayout: true,
        contextmenu: true,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        insertSpaces: true,
        lineHeight: 21,
        minimap: { enabled: false },
        padding: { top: 14, bottom: 14 },
        renderWhitespace: "selection",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 2,
        wordWrap: "on",
      }}
    />
  </div>;
}
