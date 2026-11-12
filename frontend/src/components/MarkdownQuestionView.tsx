import React from "react";

interface MarkdownQuestionViewProps {
  text: string;
  compact?: boolean;
  emptyHint?: string;
}

const MATH_SYMBOLS: Array<[RegExp, string]> = [
  [/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)"],
  [/\\sqrt\{([^{}]+)\}/g, "√($1)"],
  [/\\text\{([^{}]+)\}/g, "$1"],
  [/\\mathrm\{([^{}]+)\}/g, "$1"],
  [/\\mathbf\{([^{}]+)\}/g, "$1"],
  [/\\pi\b/g, "π"],
  [/\\sigma\b/g, "σ"],
  [/\\mu\b/g, "μ"],
  [/\\omega\b/g, "ω"],
  [/\\Omega\b/g, "Ω"],
  [/\\to\b/g, "→"],
  [/\\rightarrow\b/g, "→"],
  [/\\leftarrow\b/g, "←"],
  [/\\Rightarrow\b/g, "⇒"],
  [/\\le\b/g, "≤"],
  [/\\leq\b/g, "≤"],
  [/\\ge\b/g, "≥"],
  [/\\geq\b/g, "≥"],
  [/\\neq\b/g, "≠"],
  [/\\approx\b/g, "≈"],
  [/\\times\b/g, "×"],
  [/\\cdot\b/g, "·"],
  [/\\in\b/g, "∈"],
  [/\\notin\b/g, "∉"],
  [/\\cup\b/g, "∪"],
  [/\\cap\b/g, "∩"],
  [/\\subset\b/g, "⊂"],
  [/\\subseteq\b/g, "⊆"],
  [/\\Sigma\b/g, "Σ"],
  [/\\Delta\b/g, "Δ"],
  [/\\delta\b/g, "δ"],
  [/\\alpha\b/g, "α"],
  [/\\beta\b/g, "β"],
  [/\\gamma\b/g, "γ"],
  [/\\epsilon\b/g, "ε"],
  [/\\varepsilon\b/g, "ε"],
  [/\\eta\b/g, "η"],
  [/\\lambda\b/g, "λ"],
  [/\\theta\b/g, "θ"],
  [/\\sum\b/g, "∑"],
  [/\\prod\b/g, "∏"],
  [/\\forall\b/g, "∀"],
  [/\\exists\b/g, "∃"],
  [/\\infty\b/g, "∞"],
  [/->/g, "→"],
  [/<=/g, "≤"],
  [/>=/g, "≥"],
];

function prettifyMath(raw: string): string {
  let out = raw;
  for (const [pattern, replacement] of MATH_SYMBOLS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function renderInlineMarkdown(line: string, keyPrefix: string): React.ReactNode[] {
  const tokenRegex = /(\$\$?[^$\n]+\$\$?|`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let partIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(prettifyMath(line.slice(lastIdx, match.index)));
    }
    const token = match[0];
    const k = `${keyPrefix}-${partIdx++}`;

    if (token.startsWith("$$") && token.endsWith("$$")) {
      const inner = prettifyMath(token.slice(2, -2).trim());
      nodes.push(
        <span
          key={k}
          style={{
            display: "inline-block",
            padding: "0.15rem 0.5rem",
            margin: "0 0.15rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "#0f172a",
          }}
        >
          {inner}
        </span>
      );
    } else if (token.startsWith("$") && token.endsWith("$")) {
      const inner = prettifyMath(token.slice(1, -1).trim());
      nodes.push(
        <span
          key={k}
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "#1e293b",
            background: "#f8fafc",
            padding: "0 0.25rem",
            borderRadius: "4px",
          }}
        >
          {inner}
        </span>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      nodes.push(
        <code
          key={k}
          style={{
            background: "#f1f5f9",
            color: "#0f172a",
            border: "1px solid #e2e8f0",
            padding: "0.08rem 0.4rem",
            borderRadius: "5px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "0.86em",
            fontWeight: 600,
          }}
        >
          {prettifyMath(inner)}
        </code>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(
        <strong key={k} style={{ color: "#0f172a", fontWeight: 700 }}>
          {prettifyMath(token.slice(2, -2))}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={k} style={{ color: "#334155", fontStyle: "italic" }}>
          {prettifyMath(token.slice(1, -1))}
        </em>
      );
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < line.length) {
    nodes.push(prettifyMath(line.slice(lastIdx)));
  }

  return nodes;
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2;
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return /^\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(trimmed);
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

/**
 * Clean, pure-white academic Markdown renderer supporting headings, bold/italic,
 * inline code/grammar tokens, fenced code blocks, bullet/numbered lists, blockquotes,
 * mathematical notation, and Markdown tables.
 */
export const MarkdownQuestionView: React.FC<MarkdownQuestionViewProps> = ({
  text,
  compact = false,
  emptyHint = "Empty — double-tap to edit.",
}) => {
  const content = (text || "").trim();
  if (!content) {
    return (
      <div style={{ color: "#94a3b8", fontStyle: "italic", fontSize: compact ? "0.86rem" : "0.92rem" }}>
        {emptyHint}
      </div>
    );
  }

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // 1. Fenced Code / Grammar Block
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push(
        <pre
          key={`code-${i}`}
          style={{
            margin: "0.45rem 0",
            padding: "0.65rem 0.85rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: compact ? "0.8rem" : "0.85rem",
            lineHeight: 1.55,
            color: "#0f172a",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    // 2. Markdown Table
    if (isTableRow(rawLine) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableCells(rawLine);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableCells(lines[i]));
        i += 1;
      }
      blocks.push(
        <div key={`tbl-${i}`} style={{ overflowX: "auto", margin: "0.5rem 0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: compact ? "0.8rem" : "0.85rem",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    style={{
                      textAlign: "left",
                      padding: "0.45rem 0.65rem",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontWeight: 700,
                    }}
                  >
                    {renderInlineMarkdown(h, `th-${i}-${hIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx}>
                  {headers.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: "0.4rem 0.65rem",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                      }}
                    >
                      {renderInlineMarkdown(r[cIdx] || "", `td-${i}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 3. Heading or Horizontal Rule
    if (/^---+$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "0.55rem 0" }} />);
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(
        <div
          key={`h-${i}`}
          style={{
            fontWeight: 700,
            color: "#0f172a",
            fontSize: level === 1 ? "1.02rem" : level === 2 ? "0.96rem" : "0.91rem",
            margin: "0.28rem 0 0.18rem",
          }}
        >
          {renderInlineMarkdown(headingMatch[2], `h-${i}`)}
        </div>
      );
      i += 1;
      continue;
    }

    // 4. Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`bq-${i}`}
          style={{
            margin: "0.4rem 0",
            padding: "0.45rem 0.75rem",
            borderLeft: "3px solid #2563eb",
            background: "#f8fafc",
            borderRadius: "0 6px 6px 0",
            color: "#334155",
            fontSize: compact ? "0.85rem" : "0.9rem",
          }}
        >
          {renderInlineMarkdown(quoteLines.join(" "), `bq-${i}`)}
        </blockquote>
      );
      continue;
    }

    // 5. Unordered List
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul
          key={`ul-${i}`}
          style={{
            margin: "0.35rem 0 0.35rem 1.25rem",
            padding: 0,
            color: "#1e293b",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {items.map((item, idx) => (
            <li key={idx} style={{ lineHeight: 1.55 }}>
              {renderInlineMarkdown(item, `ul-${i}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered List
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol
          key={`ol-${i}`}
          style={{
            margin: "0.35rem 0 0.35rem 1.35rem",
            padding: 0,
            color: "#1e293b",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {items.map((item, idx) => (
            <li key={idx} style={{ lineHeight: 1.55 }}>
              {renderInlineMarkdown(item, `ol-${i}-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Standard Paragraph (merge consecutive non-special lines cleanly, preserving grammar line breaks if short)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith(">") &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+[.)]\s+/.test(lines[i].trim()) &&
      !isTableRow(lines[i])
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }

    blocks.push(
      <p
        key={`p-${i}`}
        style={{
          margin: compact ? "0.2rem 0" : "0.3rem 0",
          lineHeight: 1.62,
          color: "#0f172a",
          fontSize: compact ? "0.88rem" : "0.94rem",
        }}
      >
        {paraLines.map((pl, pIdx) => (
          <React.Fragment key={pIdx}>
            {pIdx > 0 && <br />}
            {renderInlineMarkdown(pl, `p-${i}-${pIdx}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div style={{ width: "100%", wordBreak: "break-word" }}>{blocks}</div>;
};
