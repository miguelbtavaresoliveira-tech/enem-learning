import ReactMarkdown, { type Components } from 'react-markdown';
import type { Alternative, Question } from './types';
import { C } from './ui';

function ZoomableImage({ src, alt, link = true }: { src: string; alt?: string; link?: boolean }) {
  const img = (
    <img
      src={src}
      alt={alt || 'Imagem da questão'}
      loading="lazy"
      style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '12px auto', borderRadius: 8, border: `1px solid ${C.outlineVariant}66`, background: '#fff' }}
    />
  );
  if (!link) return img;
  return (
    <a href={src} target="_blank" rel="noreferrer" title="Abrir imagem em tamanho original" style={{ display: 'block' }}>
      {img}
    </a>
  );
}

const blockComponents: Components = {
  img: ({ src, alt }) => (typeof src === 'string' && src ? <ZoomableImage src={src} alt={alt} /> : null),
  p: ({ children }) => <p style={{ margin: '0 0 12px' }}>{children}</p>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: C.primaryContainer, textDecoration: 'underline' }}>{children}</a>,
  blockquote: ({ children }) => <blockquote style={{ margin: '12px 0', paddingLeft: 16, borderLeft: `3px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, fontStyle: 'italic' }}>{children}</blockquote>,
  ul: ({ children }) => <ul style={{ margin: '0 0 12px', paddingLeft: 24 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '0 0 12px', paddingLeft: 24 }}>{children}</ol>,
  h1: ({ children }) => <p style={{ margin: '0 0 12px', fontWeight: 700 }}>{children}</p>,
  h2: ({ children }) => <p style={{ margin: '0 0 12px', fontWeight: 700 }}>{children}</p>,
  h3: ({ children }) => <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{children}</p>,
};

const inlineComponents: Components = {
  ...blockComponents,
  p: ({ children }) => <span style={{ display: 'block' }}>{children}</span>,
};

// Rendered inside the answer <button>: no nested links.
const alternativeComponents: Components = {
  ...inlineComponents,
  img: ({ src, alt }) => (typeof src === 'string' && src ? <ZoomableImage src={src} alt={alt} link={false} /> : null),
  a: ({ children }) => <span style={{ textDecoration: 'underline' }}>{children}</span>,
};

/** Texto-base, imagens e comando da questão, sem truncar nada. */
export function QuestionStatement({ question }: { question: Question }) {
  const context = question.context ?? '';
  const extraFiles = (question.files ?? []).filter(url => !context.includes(url));

  return (
    <>
      {(context.trim() || extraFiles.length > 0) && (
        <div style={{
          background: C.surfaceLowest, borderRadius: 12,
          border: `1px solid ${C.outlineVariant}66`,
          boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          padding: '20px 24px', marginBottom: 16,
          fontSize: 16, lineHeight: '28px', letterSpacing: '-0.005em', color: C.onSurface,
          overflowWrap: 'anywhere',
        }}>
          {context.trim() && <ReactMarkdown components={blockComponents}>{context}</ReactMarkdown>}
          {extraFiles.map(url => <ZoomableImage key={url} src={url} />)}
        </div>
      )}
      {question.alternativesIntroduction?.trim() && (
        <div style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 600, color: C.onSurface, margin: '4px 0 16px', overflowWrap: 'anywhere' }}>
          <ReactMarkdown components={inlineComponents}>{question.alternativesIntroduction}</ReactMarkdown>
        </div>
      )}
    </>
  );
}

/** Conteúdo de uma alternativa: texto (markdown) e/ou imagem. */
export function AlternativeBody({ alt }: { alt: Alternative }) {
  const text = alt.text ?? '';
  return (
    <div style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.6, paddingTop: 3, overflowWrap: 'anywhere' }}>
      {text.trim() && <ReactMarkdown components={alternativeComponents}>{text}</ReactMarkdown>}
      {alt.file && !text.includes(alt.file) && <ZoomableImage src={alt.file} alt={`Alternativa ${alt.letter}`} link={false} />}
    </div>
  );
}
