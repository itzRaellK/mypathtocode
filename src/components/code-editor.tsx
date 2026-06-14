"use client";

import Editor, { type BeforeMount } from "@monaco-editor/react";

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

const beforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("my-path-code", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "65736D" },
      { token: "keyword", foreground: "58F58C" },
      { token: "number", foreground: "F5B958" },
      { token: "string", foreground: "A8D9BA" },
      { token: "type", foreground: "71B7FF" },
    ],
    colors: {
      "editor.background": "#060A0C",
      "editor.foreground": "#CBD6D1",
      "editorCursor.foreground": "#58F58C",
      "editor.selectionBackground": "#17432A",
      "editor.inactiveSelectionBackground": "#102E1D",
      "editor.lineHighlightBackground": "#0A1012",
      "editorLineNumber.foreground": "#3E4A45",
      "editorLineNumber.activeForeground": "#8BA099",
      "editorIndentGuide.background1": "#18221E",
      "editorIndentGuide.activeBackground1": "#31533E",
    },
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
  return <div className="monaco-shell">
    <Editor
      beforeMount={beforeMount}
      height="100%"
      language={editorLanguage(path, language)}
      path={`file:///${modelId}/${path}`}
      theme="my-path-code"
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
