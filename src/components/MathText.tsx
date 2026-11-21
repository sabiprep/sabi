import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
}

/**
 * Normalizes ALOC's mixed HTML/Unicode/LaTeX math and emphasis notation
 * into standard KaTeX ($...$ / $$...$$) and markdown/inline emphasis tokens.
 */
function normalizeAlocMathAndMarkup(raw: string): string {
  return raw
    // 1. Repair known ALOC typos in HTML tags
    .replace(/(\d+)sup>/gi, '$1<sup>')
    .replace(/<sp>/gi, '<sup>')
    .replace(/<\/sup(?![a-zA-Z>])/gi, '</sup>')
    .replace(/<u>([^<]*?)<\/a>/gi, '<u>$1</u>')
    // 2. Strip ALOC special mathematical brackets 〖25〗 -> 25
    .replace(/〖(.*?)〗/g, '$1')
    // 3. Convert <br> tags to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // 4. Convert LaTeX \(...\) and \[...\] delimiters to $...$ and $$...$$
    .replace(/\\\[(.*?)\\\]/gs, '$$$$$1$$$$')
    .replace(/\\\((.*?)\\\)/gs, '$$$1$$')
    // 5. Convert base<sup>exponent</sup> and standalone <sup>exponent</sup> to KaTeX
    .replace(/([a-zA-Z0-9\)\]]+)\s*<sup>(.*?)<\/sup>/gi, (_, base, exp) => {
      const cleanExp = String(exp).replace(/−/g, '-').trim();
      return `$${base}^{${cleanExp}}$`;
    })
    .replace(/<sup>(.*?)<\/sup>/gi, (_, exp) => {
      const cleanExp = String(exp).replace(/−/g, '-').trim();
      return `$^{${cleanExp}}$`;
    })
    // 6. Convert base<sub>subscript</sub> and standalone <sub>subscript</sub> to KaTeX
    .replace(/([a-zA-Z0-9\)\]]+)\s*<sub>(.*?)<\/sub>/gi, (_, base, sub) => {
      const cleanSub = String(sub).trim();
      return `$${base}_{${cleanSub}}$`;
    })
    .replace(/<sub>(.*?)<\/sub>/gi, (_, sub) => {
      const cleanSub = String(sub).trim();
      return `$_{${cleanSub}}$`;
    })
    // 7. Convert HTML <b>/<strong> and <i>/<em> to markdown equivalents
    .replace(/<(?:b|strong)>(.*?)<\/(?:b|strong)>/gis, '**$1**')
    .replace(/<(?:i|em)>(.*?)<\/(?:i|em)>/gis, '*$1*');
}

function parseUnderline(text: string): React.ReactNode {
  const parts = text.split(/(<u>.*?<\/u>)/gis);
  return (
    <>
      {parts.map((part, idx) => {
        if (/^<u>.*<\/u>$/is.test(part)) {
          const inner = part.replace(/^<u>|<\/u>$/gi, '');
          return (
            <u
              key={`u-${idx}`}
              className="underline decoration-2 underline-offset-4 font-extrabold text-amber-400 dark:text-amber-300"
            >
              {inner}
            </u>
          );
        }
        return part;
      })}
    </>
  );
}

function parseItalics(text: string): React.ReactNode {
  const italicParts = text.split(/(\*[^*]+\*)/gs);
  return (
    <>
      {italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 2) {
          const innerText = iPart.substring(1, iPart.length - 1);
          return (
            <em
              key={`italic-${iIdx}`}
              className="italic underline decoration-dotted underline-offset-4 font-semibold"
            >
              {parseUnderline(innerText)}
            </em>
          );
        } else {
          return <React.Fragment key={`plain-${iIdx}`}>{parseUnderline(iPart)}</React.Fragment>;
        }
      })}
    </>
  );
}

function parseMarkdownFormatting(text: string): React.ReactNode {
  const boldParts = text.split(/(\*\*.*?\*\*)/gs);
  return (
    <>
      {boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          const innerText = bPart.substring(2, bPart.length - 2);
          return (
            <strong key={`bold-${bIdx}`} className="font-extrabold">
              {parseItalics(innerText)}
            </strong>
          );
        } else {
          return <React.Fragment key={`not-bold-${bIdx}`}>{parseItalics(bPart)}</React.Fragment>;
        }
      })}
    </>
  );
}

export default function MathText({ text }: MathTextProps) {
  if (!text) return null;

  const normalized = normalizeAlocMathAndMarkup(text);

  try {
    // Split by $$ first for block display equations
    const blockParts = normalized.split(/(\$\$.*?\$\$)/gs);

    return (
      <span className="math-text-rendered">
        {blockParts.map((bPart, bIdx) => {
          if (bPart.startsWith('$$') && bPart.endsWith('$$')) {
            const formula = bPart.substring(2, bPart.length - 2).trim();
            try {
              const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
              return (
                <div
                  key={`block-${bIdx}`}
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="my-3 py-1 overflow-x-auto max-w-full text-center"
                />
              );
            } catch {
              return (
                <div key={`block-err-${bIdx}`} className="font-mono text-xs opacity-75 my-2 block">
                  {formula}
                </div>
              );
            }
          } else {
            // Parse for inline math $...$
            const inlineParts = bPart.split(/(\$.*?\$)/gs);
            return (
              <span key={`inline-container-${bIdx}`}>
                {inlineParts.map((iPart, iIdx) => {
                  if (iPart.startsWith('$') && iPart.endsWith('$') && iPart.length > 2) {
                    const formula = iPart.substring(1, iPart.length - 1).trim();
                    try {
                      const html = katex.renderToString(formula, {
                        displayMode: false,
                        throwOnError: false,
                      });
                      return (
                        <span
                          key={`inline-math-${iIdx}`}
                          dangerouslySetInnerHTML={{ __html: html }}
                          className="inline-block px-0.5 align-middle"
                        />
                      );
                    } catch {
                      return (
                        <span key={`inline-err-${iIdx}`} className="font-mono text-xs opacity-75">
                          {formula}
                        </span>
                      );
                    }
                  }
                  return (
                    <span key={`inline-text-${iIdx}`} className="whitespace-pre-wrap">
                      {parseMarkdownFormatting(iPart)}
                    </span>
                  );
                })}
              </span>
            );
          }
        })}
      </span>
    );
  } catch {
    const cleanedText = normalized.replace(/\$\$/g, '').replace(/\$/g, '');
    return <span className="whitespace-pre-line">{parseMarkdownFormatting(cleanedText)}</span>;
  }
}
