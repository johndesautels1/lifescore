/**
 * LIFE SCORE - Fetch with Timeout Unit Tests
 * Tests the timeout wrapper around native fetch
 */
import { describe, it, expect, vi } from 'vitest';
import { fetchWithTimeout } from '../src/lib/fetchWithTimeout';

describe('fetchWithTimeout', () => {
  it('returns response on successful fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const result = await fetchWithTimeout('https://example.com', {});
    expect(result.status).toBe(200);

    vi.restoreAllMocks();
  });

  it('passes options to fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await fetchWithTimeout('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    vi.restoreAllMocks();
  });

  it('throws timeout error when fetch takes too long', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          // Simulate abort signal triggering
          const signal = (options as RequestInit)?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        })
    );

    await expect(
      fetchWithTimeout('https://example.com', {}, 50) // 50ms timeout
    ).rejects.toThrow('Request timed out after 0.05 seconds');

    vi.restoreAllMocks();
  });

  it('re-throws non-abort errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'));

    await expect(
      fetchWithTimeout('https://example.com', {})
    ).rejects.toThrow('Network failure');

    vi.restoreAllMocks();
  });

  it('uses default timeout of 30000ms', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    // Just verify it doesn't throw - the default timeout is 30s
    const result = await fetchWithTimeout('https://example.com', {});
    expect(result.status).toBe(200);

    vi.restoreAllMocks();
  });
});
