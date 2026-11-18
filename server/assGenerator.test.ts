import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssSubtitles, hexToAssBgr } from './assGenerator.ts';

test('hexToAssBgr converts RGB hex to ASS BGR format', () => {
  assert.equal(hexToAssBgr('#4CD7F6'), '&H00F6D74C');
  assert.equal(hexToAssBgr('#FFFFFF'), '&H00FFFFFF');
  assert.equal(hexToAssBgr('invalid'), '&H00FFFFFF');
});

test('buildAssSubtitles generates valid ASS script for all caption styles', () => {
  const styles = [
    'dynamic_pop',
    'karaoke_fill',
    'word_highlighter',
    'bold_punch',
    'clean_minimal',
    'keyword_focus',
  ] as const;

  for (const style of styles) {
    const ass = buildAssSubtitles({
      style,
      fontName: 'Noto Sans',
      accentHex: '#4CD7F6',
      segments: [
        { id: 's1', startSec: 0, endSec: 2.5, text: 'The one framework that changed everything' },
      ],
    });
    assert.ok(ass.includes('PlayResX: 1080'));
    assert.ok(ass.includes('PlayResY: 1920'));
    assert.ok(ass.includes('Dialogue: 0,'));
  }
});
