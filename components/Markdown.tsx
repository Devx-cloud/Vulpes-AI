import { isValidElement, memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CopyButton from "./CopyButton";

// Blok kode dengan label bahasa dan tombol salin.
function CodeBlock({ children }: { children?: ReactNode }) {
  const code = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children.props : null;
  const lang = code?.className?.replace("language-", "") ?? "";
  const text = String(code?.children ?? "").replace(/\n$/, "");
  return (
    <div className="code">
      <div className="code-head">
        <span>{lang || "kode"}</span>
        <CopyButton text={text} label="Salin kode" small />
      </div>
      <pre>{children}</pre>
    </div>
  );
}

const components: Components = {
  pre: CodeBlock,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

// HTML mentah tidak dirender (bawaan react-markdown), jadi jawaban model aman ditampilkan.
function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
