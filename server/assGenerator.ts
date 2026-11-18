import type { CaptionStyleId, TranscriptSegment } from '../src/shared/types.ts';

function toAssTimestamp(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const cs = Math.min(99, Math.round((safe - Math.floor(safe)) * 100));
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Converts #RRGGBB hex to ASS &HAABBGGRR color format (AA=00 opaque).
 */
export function hexToAssBgr(hex: string, alpha = '00'): string {
  const cleaned = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `&H${alpha}FFFFFF`;
  }
  const r = cleaned.slice(0, 2).toUpperCase();
  const g = cleaned.slice(2, 4).toUpperCase();
  const b = cleaned.slice(4, 6).toUpperCase();
  return `&H${alpha}${b}${g}${r}`;
}

function escapeAssText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/\r?\n/g, ' ')
    .trim();
}

export interface AssBuildOptions {
  style: CaptionStyleId;
  fontName: string;
  accentHex: string;
  segments: TranscriptSegment[];
}

export function buildAssSubtitles(opts: AssBuildOptions): string {
  const font = opts.fontName || 'Noto Sans';
  const accentAss = hexToAssBgr(opts.accentHex || '#4CD7F6');
  const whiteAss = '&H00FFFFFF';
  const yellowAss = '&H0047E0FD'; // #FDE047 in BGR
  const purpleAss = '&H00FFD0BC'; // #D0BCFF in BGR
  const blackOutline = '&H000C0E17';
  const shadowBox = '&H880C0E17';

  let primaryColor = whiteAss;
  let secondaryColor = accentAss;
  let outlineColor = blackOutline;
  let backColor = shadowBox;
  let borderStyle = 1;
  let outline = 5;
  let shadow = 2;
  let fontSize = 68;
  let uppercase = false;

  switch (opts.style) {
    case 'dynamic_pop':
      primaryColor = whiteAss;
      secondaryColor = accentAss;
      fontSize = 72;
      outline = 6;
      uppercase = true;
      break;
    case 'karaoke_fill':
      primaryColor = accentAss;
      secondaryColor = whiteAss;
      fontSize = 68;
      outline = 5;
      break;
    case 'word_highlighter':
      primaryColor = '&H0011131C';
      secondaryColor = accentAss;
      outlineColor = accentAss;
      backColor = accentAss;
      borderStyle = 3;
      outline = 14;
      shadow = 0;
      fontSize = 64;
      uppercase = true;
      break;
    case 'bold_punch':
      primaryColor = yellowAss;
      secondaryColor = accentAss;
      fontSize = 76;
      outline = 7;
      shadow = 3;
      uppercase = true;
      break;
    case 'clean_minimal':
      primaryColor = whiteAss;
      secondaryColor = purpleAss;
      fontSize = 56;
      outline = 3;
      shadow = 2;
      uppercase = false;
      break;
    case 'keyword_focus':
      primaryColor = whiteAss;
      secondaryColor = purpleAss;
      fontSize = 66;
      outline = 5;
      uppercase = true;
      break;
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${fontSize},${primaryColor},${secondaryColor},${outlineColor},${backColor},-1,0,0,0,100,100,1,0,${borderStyle},${outline},${shadow},2,72,72,270,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines: string[] = [];

  for (const seg of opts.segments) {
    const raw = escapeAssText(seg.text);
    if (!raw) continue;
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    // Split longer segments into 3-4 word punchy chunks for vertical mobile readability
    const chunkSize = opts.style === 'clean_minimal' ? 6 : 3;
    const chunks: string[][] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize));
    }

    const segDuration = Math.max(0.4, seg.endSec - seg.startSec);
    const totalWords = words.length;
    let cursor = seg.startSec;

    for (const chunk of chunks) {
      const chunkDuration = (chunk.length / totalWords) * segDuration;
      const chunkStart = cursor;
      const chunkEnd = Math.min(seg.endSec, cursor + chunkDuration);
      cursor = chunkEnd;

      const startStr = toAssTimestamp(chunkStart);
      const endStr = toAssTimestamp(Math.max(chunkStart + 0.25, chunkEnd));

      const displayWords = chunk.map((w) => (uppercase ? w.toUpperCase() : w));

      let formattedText = '';
      if (opts.style === 'karaoke_fill') {
        const wordCs = Math.max(12, Math.round(((chunkEnd - chunkStart) * 100) / displayWords.length));
        formattedText = displayWords.map((w) => `{\\kf${wordCs}}${w}`).join(' ');
      } else if (opts.style === 'dynamic_pop') {
        const mid = Math.floor(displayWords.length / 2);
        const styled = displayWords.map((w, idx) =>
          idx === mid ? `{\\c${accentAss}\\fscx110\\fscy110}${w}{\\r}` : w,
        );
        formattedText = `{\\fscx88\\fscy88\\t(0,90,\\fscx103\\fscy103)}${styled.join(' ')}`;
      } else if (opts.style === 'keyword_focus') {
        // Highlight longest word in neon accent
        let longestIdx = 0;
        displayWords.forEach((w, i) => {
          if (w.length > displayWords[longestIdx].length) longestIdx = i;
        });
        formattedText = displayWords
          .map((w, i) => (i === longestIdx ? `{\\c${accentAss}}${w}{\\r}` : w))
          .join(' ');
      } else {
        formattedText = `{\\fad(60,40)}${displayWords.join(' ')}`;
      }

      lines.push(`Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${formattedText}`);
    }
  }

  return header + lines.join('\n') + '\n';
}
