import { useMemo, useState } from 'react';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';

function parseArticleBody(value = '') {
  const lines = String(value).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let code = null;
  let list = null;

  function flushList() {
    if (!list) return;
    blocks.push(list);
    list = null;
  }

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      flushList();
      if (code) {
        blocks.push({ type: 'code', value: code.lines.join('\n'), language: code.language });
        code = null;
      } else {
        code = { language: line.trim().slice(3).trim(), lines: [] };
      }
      return;
    }

    if (code) {
      code.lines.push(line);
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push({ type: 'heading', level: heading[1].length, value: heading[2].trim() });
      return;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { type: 'list', ordered, items: [] };
      }
      list.items.push((bullet || numbered)[1].trim());
      return;
    }

    flushList();
    if (line.trim()) blocks.push({ type: 'paragraph', value: line.trim() });
  });

  flushList();
  if (code) blocks.push({ type: 'code', value: code.lines.join('\n'), language: code.language });
  return blocks;
}

function headingId(value, index) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `article-section-${slug || index}`;
}

function CodeBlock({ value, language }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="kb-code-block">
      <div className="kb-code-toolbar">
        <span>{language || 'Command'}</span>
        <button type="button" onClick={copyCode} title="Copy command">
          <AppIcon name="copy" size={15} />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre><code>{value}</code></pre>
    </div>
  );
}

export function ArticleBody({ value = '' }) {
  const blocks = useMemo(() => parseArticleBody(value), [value]);
  const headings = blocks
    .map((block, index) => (block.type === 'heading' ? { ...block, id: headingId(block.value, index) } : null))
    .filter(Boolean);

  return (
    <div className="kb-article-content-layout">
      <div className="kb-article-body">
        {blocks.map((block, index) => {
          if (block.type === 'heading') {
            const Heading = `h${Math.min(block.level + 2, 5)}`;
            return <Heading id={headingId(block.value, index)} key={`${block.type}-${index}`}>{block.value}</Heading>;
          }
          if (block.type === 'list') {
            const List = block.ordered ? 'ol' : 'ul';
            return <List key={`${block.type}-${index}`}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</List>;
          }
          if (block.type === 'code') return <CodeBlock key={`${block.type}-${index}`} value={block.value} language={block.language} />;
          return <p key={`${block.type}-${index}`}>{block.value}</p>;
        })}
      </div>
      {headings.length > 1 ? (
        <nav className="kb-article-toc" aria-label="Article contents">
          <strong>On this page</strong>
          {headings.map((heading) => <a key={heading.id} href={`#${heading.id}`}>{heading.value}</a>)}
        </nav>
      ) : null}
    </div>
  );
}
