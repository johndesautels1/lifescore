/**
 * LIFE SCORE - the Ask Olivia screen names the model Olivia actually runs on (anti-drift).
 *
 * John, 4 Oct 2026 ("Model's name"): the screen's status light said
 * "OPENAI BRAIN" while api/olivia/chat.ts calls Claude (AI_MODELS.writer).
 * The light now prints AI_MODELS.writer's name, so a model change moves it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe("Olivia's brain light", () => {
  it('shows the model the chat route uses', () => {
    expect(readFileSync('api/olivia/chat.ts', 'utf8').includes('model: AI_MODELS.writer.id')).toBe(true);
    const screen = readFileSync('src/components/AskOlivia.tsx', 'utf8');
    expect(screen.includes('{AI_MODELS.writer.name.toUpperCase()} BRAIN')).toBe(true);
    expect(screen.includes('OPENAI BRAIN')).toBe(false);
  });
});
