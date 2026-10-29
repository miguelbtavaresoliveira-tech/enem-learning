import ReactMarkdown, { type Components } from 'react-markdown';
import type { Question, Letter } from './types';

// MD3 tokens (subset used here)
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

// Shared markdown renderer — images clickable, tables scrollable
const mdComponents: Components = {
  img: ({ src, alt }) => (
    <a href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBlock: 8 }}>
      <img src={src} alt={alt ?? ''} style={{ maxWidth: '100%', borderRadius: 6, display: 'block' }} />
    </a>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', marginBlock: 8 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 14 }}>{children}</table>
    </div>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: `3px solid ${C.outlineVariant}`, paddingLeft: 12, margin: '8px 0', color: C.onSurfaceVariant }}>
      {children}
    </blockquote>
  ),
  p: ({ children }) => <p style={{ margin: '0 0 8px', lineHeight: 1.75 }}>{children}</p>,
};

interface QuestionContentProps {
  question: Question;
  selected?: Letter;
  revealed?: boolean;
  onAnswer?: (l: Letter) => void;
  /** When true, disables answer selection (e.g. review modal) */
  readOnly?: boolean;
}

export function QuestionContent({ question, selected, revealed = false, onAnswer, readOnly = false }: QuestionContentProps) {
  // Collect image URLs already embedded in context markdown to avoid duplication
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
      {/* Context (text-base) rendered as markdown */}
      {question.context && (
        <div style={{
          background: C.surfaceContainerLow, borderRadius: 8,
          padding: '16px 20px', marginBottom: 16,
          fontSize: 16, lineHeight: 1.75, color: C.onSurface,
          border: `1px solid ${C.outlineVariant}`,
        }}>
          <ReactMarkdown components={mdComponents}>{question.context}</ReactMarkdown>
        </div>
      )}

      {/* Extra files not already in context */}
      {extraFiles.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 8 }}>
          <img src={url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
        </a>
      ))}

      {/* Command (alternativesIntroduction) with markdown */}
      {question.alternativesIntroduction && (
        <div style={{ fontSize: 15, color: C.onSurface, marginBottom: 12, fontWeight: 500, lineHeight: 1.65 }}>
          <ReactMarkdown components={mdComponents}>{question.alternativesIntroduction}</ReactMarkdown>
        </div>
      )}

      {/* Alternatives */}
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
                {alt.text && <ReactMarkdown components={mdComponents}>{alt.text}</ReactMarkdown>}
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
