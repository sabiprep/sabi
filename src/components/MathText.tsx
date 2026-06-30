import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
}

function parseItalics(text: string): React.ReactNode {
  const italicParts = text.split(/(\*.*?\*)/gs);
  return (
    <>
      {italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*')) {
          const innerText = iPart.substring(1, iPart.length - 1);
          return (
            <em key={`italic-${iIdx}`} className="italic text-slate-700 font-medium">
              {innerText}
            </em>
          );
        } else {
          return iPart;
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
            <strong key={`bold-${bIdx}`} className="font-extrabold text-[#0A1128]">
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

  try {
    // Split by $$ first for block display equations
    const blockParts = text.split(/(\$\$.*?\$\$)/gs);

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
              return <div key={`block-err-${bIdx}`} className="font-mono text-xs opacity-75 my-2 block">{formula}</div>;
            }
          } else {
            // Parse for inline math $...$
            const inlineParts = bPart.split(/(\$.*?\$)/gs);
            return (
              <span key={`inline-container-${bIdx}`}>
                {inlineParts.map((iPart, iIdx) => {
                  if (iPart.startsWith('$') && iPart.endsWith('$')) {
                    const formula = iPart.substring(1, iPart.length - 1).trim();
                    try {
                      // Avoid matching text that is a price like $50 or $100.
                      // Usually math formulas don't start with a number directly followed by space if it was a price.
                      // But since this is a JAMB app, $ is almost exclusively used for math.
                      const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
                      return (
                        <span 
                          key={`inline-math-${iIdx}`} 
                          dangerouslySetInnerHTML={{ __html: html }} 
                          className="inline-block px-1 align-middle" 
                        />
                      );
                    } catch {
                      return <span key={`inline-err-${iIdx}`} className="font-mono text-xs opacity-75">{formula}</span>;
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
  } catch (err) {
    // Fallback: strip delimiters ($) to improve readability
    const cleanedText = text
      .replace(/\$\$/g, '')
      .replace(/\$/g, '');

    return <span className="whitespace-pre-line">{parseMarkdownFormatting(cleanedText)}</span>;
  }
}

