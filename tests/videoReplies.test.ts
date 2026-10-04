/**
 * LIFE SCORE - Video and image vendor reply readers.
 * Each reader keeps the fields the routes use, checked for type, and turns a
 * changed or broken reply into "field missing" rather than a crash.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  idText,
  readMcpToolRefusal,
  readMcpToolResult,
  readReplicatePrediction,
} from '../api/shared/videoReplies';

describe('InVideo (MCP tools/call) replies', () => {
  it('a JSON-RPC error is a refusal with InVideo\'s reason', () => {
    expect(readMcpToolRefusal({ jsonrpc: '2.0', id: 'x', error: { code: -32000, message: 'Quota exceeded' } })).toBe('Quota exceeded');
    expect(readMcpToolRefusal({ error: 'Bad key' })).toBe('Bad key');
    expect(readMcpToolRefusal({ error: { code: 1 } })).toBe('no reason given');
  });

  it('a tool result marked isError is a refusal; its text is the reason', () => {
    expect(readMcpToolRefusal({ result: { isError: true, content: [{ type: 'text', text: 'Script too long' }] } })).toBe('Script too long');
    expect(readMcpToolRefusal({ result: { isError: true } })).toBe('no reason given');
    expect(readMcpToolRefusal({ result: { content: [{ type: 'text', text: 'x'.repeat(400) }], isError: true } })?.length).toBe(300);
  });

  it('a normal result is not a refusal, and its payload is read', () => {
    const ok = { result: { content: [{ type: 'text', text: '{"video_id":"v1"}' }] } };
    expect(readMcpToolRefusal(ok)).toBeUndefined();
    expect(readMcpToolResult(ok)).toBe('{"video_id":"v1"}');
    expect(readMcpToolResult({ result: { video_id: 'v2' } })).toEqual({ video_id: 'v2' });
    expect(readMcpToolResult({})).toBe('');
  });

  it('reads an id sent as text or number', () => {
    expect(idText('abc')).toBe('abc');
    expect(idText(42)).toBe('42');
    expect(idText('')).toBeUndefined();
  });

  it('the movie route checks for a refusal before reading the result (anti-drift)', () => {
    const route = readFileSync('api/movie/generate.ts', 'utf8');
    expect(route.indexOf('readMcpToolRefusal(mcpResponse)')).toBeGreaterThan(-1);
    expect(route.indexOf('readMcpToolRefusal(mcpResponse)')).toBeLessThan(route.indexOf('readMcpToolResult(mcpResponse)'));
    // Stored on the movie row AND sent to the screen, which shows it.
    expect(route.match(/error: invideoResult\.error \|\| null/g)?.length).toBe(2);
    expect(readFileSync('src/components/MovieGenerator.tsx', 'utf8')).toMatch(/screenplay_ready[\s\S]*\{movieState\.error && \(/);
  });
});
import { asRecord, finite, readIceServers, text } from '../api/shared/jsonRead';

describe('shared JSON readers (api/shared/jsonRead.ts)', () => {
  it('reads only well-typed values', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord([1])).toEqual({});
    expect(asRecord(null)).toEqual({});
    expect(text('x')).toBe('x');
    expect(text('')).toBeUndefined();
    expect(text(3)).toBeUndefined();
    expect(finite(2.5)).toBe(2.5);
    expect(finite(Number.NaN)).toBeUndefined();
    expect(finite('2')).toBeUndefined();
  });

  it('reads ICE server lists as Simli, HeyGen and D-ID send them', () => {
    expect(readIceServers([
      { urls: 'stun:stun.example:3478' },
      { urls: ['turn:t.example:3478', 7], username: 'u', credential: 'c' },
      { urls: [] },
      { username: 'no-url' },
      'junk',
    ])).toEqual([
      { urls: 'stun:stun.example:3478' },
      { urls: ['turn:t.example:3478'], username: 'u', credential: 'c' },
    ]);
    expect(readIceServers({ urls: 'not a list' })).toEqual([]);
  });

  it('no other server file keeps its own copy of these readers (anti-drift)', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : name.endsWith('.ts') ? [path.replace(/\\/g, '/')] : [];
    });
    const offenders = files('api').filter(
      (f) => f !== 'api/shared/jsonRead.ts' && /function (isRecord|asRecord|record)\(|function readIceServers\(/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

describe('readReplicatePrediction', () => {
  it('keeps the fields the routes read from a finished prediction', () => {
    const p = readReplicatePrediction({
      id: 'abc123',
      status: 'succeeded',
      output: ['https://replicate.delivery/x/video.mp4'],
      error: null,
      created_at: '2026-10-03T10:00:00Z',
      completed_at: '2026-10-03T10:00:07Z',
      metrics: { predict_time: 6.4 },
      urls: { get: 'https://api.replicate.com/v1/predictions/abc123', cancel: 'x' },
      logs: 'ignored',
    });
    expect(p).toEqual({
      id: 'abc123',
      status: 'succeeded',
      output: ['https://replicate.delivery/x/video.mp4'],
      error: undefined,
      created_at: '2026-10-03T10:00:00Z',
      completed_at: '2026-10-03T10:00:07Z',
      metrics: { predict_time: 6.4 },
      urls: { get: 'https://api.replicate.com/v1/predictions/abc123' },
    });
  });

  it('accepts a single output URL and drops non-text list items', () => {
    expect(readReplicatePrediction({ output: 'https://a/b.webp' }).output).toBe('https://a/b.webp');
    expect(readReplicatePrediction({ output: [42, 'https://a/c.webp', null] }).output).toEqual(['https://a/c.webp']);
  });

  it('turns a broken reply into missing fields, never a throw', () => {
    for (const body of [null, undefined, 'text', 7, [], { id: 5, status: {}, metrics: 'x', urls: [] }]) {
      const p = readReplicatePrediction(body);
      expect(p.id).toBeUndefined();
      expect(p.status).toBeUndefined();
      expect(p.urls?.get).toBeUndefined();
      expect(p.metrics?.predict_time).toBeUndefined();
    }
  });
});

