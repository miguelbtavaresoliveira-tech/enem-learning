import type { CSSProperties, ReactNode } from 'react';
import type { Question, Letter } from './types';

function normalizeImgHtml(text: string): string {
  return text.replace(/<img\s[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_m, src) => `![](${src})`);
}

function renderMd(text: string, imgStyle?: CSSProperties): ReactNode[] {
  const normalized = normalizeImgHtml(text);
  const blocks = normalized.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((https?:\/\/[^)]+)\)$/);
    if (imgMatch) {
      const [, alt, src] = imgMatch;
      return (
        <a key={bi} href={src} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', marginBlock: 8 }}>
          <img src={src} alt={alt || 'Imagem da questão'}
            style={{ maxWidth: '100%', borderRadius: 6, display: 'block', ...imgStyle }} loading="lazy" />
        </a>
      );
    }
    const nodes = inlineMd(trimmed, bi);
    return <div key={bi} style={{ margin: '0 0 8px', lineHeight: 1.75 }}>{nodes}</div>;
  }).filter(Boolean) as ReactNode[];
}

function inlineMd(text: string, baseKey: number): ReactNode[] {
  const pattern = /!\[(.*?)\]\((https?:\/\/[^)]+)\)|\*\*(.*?)\*\*|__(.*?)__|_(.*?)_|\*(.*?)\*/g;
  const nodes: ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined || m[2] !== undefined) {
      const src = m[2]; const alt = m[1];
      if (src) nodes.push(
        <a key={`${baseKey}-i${i}`} href={src} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', marginBlock: 4 }}>
          <img src={src} alt={alt || ''} loading="lazy"
            style={{ maxWidth: '100%', borderRadius: 6, display: 'block' }} />
        </a>
      );
    } else if (m[3] !== undefined) nodes.push(<strong key={`${baseKey}-b${i}`}>{m[3]}</strong>);
    else if (m[4] !== undefined) nodes.push(<strong key={`${baseKey}-b${i}`}>{m[4]}</strong>);
    else if (m[5] !== undefined) nodes.push(<em key={`${baseKey}-e${i}`}>{m[5]}</em>);
    else if (m[6] !== undefined) nodes.push(<em key={`${baseKey}-e${i}`}>{m[6]}</em>);
    last = m.index + m[0].length; i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const C = {
  primary: '#0037b0',
  primaryContainer: '#1d4ed8',
  primaryFixed: '#dce1ff',
  onPrimary: '#ffffff',
  secondary: '#006d30',
  secondaryContainer: '#92f5a4',
  onSecondary: '#ffffff',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  surface: '#faf8ff',
  surfaceLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainerHigh: '#e2e7ff',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  outlineVariant: '#c4c5d7',
  outline: '#747686',
};

interface QuestionContentProps {
  question: Question;
  selected?: Letter;
  revealed?: boolean;
  onAnswer?: (l: Letter) => void;
  readOnly?: boolean;
}

export function QuestionContent({ question, selected, revealed = false, onAnswer, readOnly = false }: QuestionContentProps) {
  const contextImageUrls = new Set<string>();
  if (question.context) {
    const re = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(question.context)) !== null) {
      contextImageUrls.add(m[1]);
    }
  }

  const extraFiles = (question.files ?? []).filter(url => !contextImageUrls.has(url));

  return (
    <div>
      {question.context && (
        <div style={{
          background: C.surfaceContainerLow, borderRadius: 8,
          padding: '16px 20px', marginBottom: 16,
          fontSize: 16, lineHeight: 1.75, color: C.onSurface,
          border: `1px solid ${C.outlineVariant}`,
        }}>
          {renderMd(question.context)}
        </div>
      )}

      {extraFiles.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 8 }}>
          <img src={url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
        </a>
      ))}

      {question.alternativesIntroduction && (
        <div style={{ fontSize: 15, color: C.onSurface, marginBottom: 12, fontWeight: 500, lineHeight: 1.65 }}>
          {renderMd(question.alternativesIntroduction)}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.alternatives.map(alt => {
          const isSelected = selected === alt.letter;
          const isCorrect = alt.isCorrect;
          let bg = C.surfaceLowest;
          let border = `1px solid ${C.outlineVariant}`;
          let color = C.onSurface;
          let badgeBg = C.surfaceContainerHigh;
          let badgeColor = C.onSurfaceVariant;

          if (revealed) {
            if (isCorrect) {
              bg = 'rgba(146,245,164,0.2)'; border = `2px solid ${C.secondary}`; color = '#004d22';
              badgeBg = C.secondary; badgeColor = C.onSecondary;
            } else if (isSelected) {
              bg = 'rgba(255,218,214,0.4)'; border = `2px solid ${C.error}`; color = C.error;
              badgeBg = C.error; badgeColor = C.onError;
            }
          } else if (isSelected) {
            bg = 'rgba(220,225,255,0.4)'; border = `2px solid ${C.primaryContainer}`; color = C.primary;
            badgeBg = C.primaryContainer; badgeColor = C.onPrimary;
          }

          const clickable = !revealed && !readOnly && !!onAnswer;

          return (
            <button
              key={alt.letter}
              onClick={() => clickable && onAnswer!(alt.letter)}
              disabled={!clickable}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                background: bg, border, borderRadius: 8,
                cursor: clickable ? 'pointer' : 'default',
                textAlign: 'left', color, transition: 'all 0.12s', width: '100%',
              }}
            >
              <span style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: 4,
                background: badgeBg, color: badgeColor,
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{alt.letter}</span>
              <div style={{ fontSize: 15, lineHeight: 1.6, paddingTop: 3 }}>
                {alt.text && renderMd(alt.text)}
                {alt.file && (
                  <a href={alt.file} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6 }}>
                    <img src={alt.file} alt={`Alternativa ${alt.letter}`} style={{ maxWidth: '100%', borderRadius: 6 }} />
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
