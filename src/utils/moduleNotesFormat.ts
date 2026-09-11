export const isLegacyPlainNotes = (raw: string): boolean => !!raw && !/<[a-z][\s\S]*>/i.test(raw);

export interface NotesBlock {
  html: string;
  isHeading: boolean;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const legacyToBlocks = (raw: string): NotesBlock[] =>
  raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      p.startsWith('## ')
        ? { html: escapeHtml(p.replace(/^##\s*/, '')), isHeading: true }
        : { html: escapeHtml(p).replace(/\n/g, '<br>'), isHeading: false }
    );

// New modules: every top-level element the rich editor produced (<h3>, <div>, <p>, <ul>...)
// is its own block. This is what keeps pasted PDF spacing exactly as copied.
const richToBlocks = (html: string): NotesBlock[] => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return Array.from(wrapper.children)
    .filter((el) => (el.textContent || '').trim().length > 0)
    .map((el) => ({ html: el.tagName === 'H3' ? el.innerHTML : el.outerHTML, isHeading: el.tagName === 'H3' }));
};

export const notesToBlocks = (raw: string | null | undefined): NotesBlock[] => {
  if (!raw) return [];
  return isLegacyPlainNotes(raw) ? legacyToBlocks(raw) : richToBlocks(raw);
};

export const notesToPlainText = (raw: string | null | undefined): string => {
  if (!raw) return '';
  if (isLegacyPlainNotes(raw)) return raw;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = raw;
  return wrapper.textContent || '';
};