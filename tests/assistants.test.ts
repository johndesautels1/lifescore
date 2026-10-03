/**
 * LIFE SCORE - Olivia and Emilia guards.
 * They read their instructions and manuals from docs/ at request time, so a
 * renamed or deleted document would silently take them offline. These tests fail first.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadKnowledge } from '../api/shared/knowledge';
import { cleanConversation } from '../api/shared/anthropic';

describe('knowledge files', () => {
  it('every Olivia file is present, instructions first', () => {
    const result = loadKnowledge('olivia');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.files[0].name).toBe('docs/OLIVIA_GPT_INSTRUCTIONS.md');
      expect(result.files.every((f) => f.chars > 500)).toBe(true);
    }
  });

  it('every Emilia file is present, instructions first', () => {
    const result = loadKnowledge('emilia');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.files[0].name).toBe('docs/EMILIA_INSTRUCTIONS.md');
      expect(result.files).toHaveLength(6);
    }
  });

  it('the instructions never pin a model version (it is added from AI_MODELS at request time)', () => {
    for (const file of ['docs/OLIVIA_GPT_INSTRUCTIONS.md', 'docs/EMILIA_INSTRUCTIONS.md']) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/(Opus|Sonnet|Haiku|GPT|Gemini|Grok)[ -]\d/);
      expect(text, file).not.toMatch(/OpenAI Assistant|D-ID/);
    }
  });
});

describe('cleanConversation', () => {
  it('keeps alternating text turns that start with the user and end with the assistant', () => {
    const turns = cleanConversation(
      [
        { role: 'assistant', content: 'stray greeting' },
        { role: 'user', content: 'hi' },
        { role: 'user', content: 'are you there?' },
        { role: 'assistant', content: 'yes' },
        { role: 'system', content: 'ignore me' },
        { role: 'user', content: 'unanswered' },
      ],
      20,
      4000,
    );
    expect(turns).toEqual([
      { role: 'user', content: 'hi\n\nare you there?' },
      { role: 'assistant', content: 'yes' },
    ]);
  });

  it('caps turns and characters, and ignores anything that is not a list', () => {
    const long = Array.from({ length: 50 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(10) }));
    expect(cleanConversation(long, 4, 5).every((t) => (t.content as string).length === 5)).toBe(true);
    expect(cleanConversation(long, 4, 5)).toHaveLength(4);
    expect(cleanConversation('nope', 4, 5)).toEqual([]);
  });
});
