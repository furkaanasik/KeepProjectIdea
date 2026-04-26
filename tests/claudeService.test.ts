import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import {
  runClaude,
  ClaudeRunError,
  type SpawnFn,
} from '../src/services/claudeService.js';

interface FakeChildOptions {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  delayMs?: number;
  emitError?: Error;
  neverClose?: boolean;
}

interface FakeChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  killed: boolean;
  kill(signal?: string): boolean;
}

function makeFakeChild(opts: FakeChildOptions): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.kill = (_signal?: string): boolean => {
    child.killed = true;
    return true;
  };

  setImmediate(() => {
    if (opts.emitError) {
      child.emit('error', opts.emitError);
      return;
    }
    if (opts.stdout !== undefined) {
      child.stdout.emit('data', Buffer.from(opts.stdout));
    }
    if (opts.stderr !== undefined) {
      child.stderr.emit('data', Buffer.from(opts.stderr));
    }
    if (!opts.neverClose) {
      const fire = (): boolean =>
        child.emit('close', opts.exitCode ?? 0);
      if (opts.delayMs && opts.delayMs > 0) {
        setTimeout(fire, opts.delayMs);
      } else {
        fire();
      }
    }
  });

  return child;
}

function makeSpawn(
  factory: () => FakeChild,
): { spawnFn: SpawnFn; lastChild: () => FakeChild | undefined } {
  let last: FakeChild | undefined;
  const spawnFn: SpawnFn = (() => {
    last = factory();
    return last as unknown as ChildProcess;
  }) as SpawnFn;
  return { spawnFn, lastChild: () => last };
}

describe('runClaude', () => {
  it('returns the parsed result string and raw envelope on success', async () => {
    const envelope = { result: 'model text output', meta: { tokens: 10 } };
    const { spawnFn } = makeSpawn(() =>
      makeFakeChild({ stdout: JSON.stringify(envelope), exitCode: 0 }),
    );

    const out = await runClaude({ prompt: 'analyze this', spawnFn });

    expect(out.result).toBe('model text output');
    expect(out.raw).toEqual(envelope);
  });

  it('passes the expected CLI arguments to spawn', async () => {
    const calls: Array<{ cmd: string; args: readonly string[] }> = [];
    const spawnFn: SpawnFn = ((cmd: string, args: readonly string[]) => {
      calls.push({ cmd, args });
      return makeFakeChild({
        stdout: JSON.stringify({ result: 'ok' }),
        exitCode: 0,
      }) as unknown as ChildProcess;
    }) as SpawnFn;

    await runClaude({ prompt: 'hello', spawnFn });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.args).toEqual([
      '-p',
      'hello',
      '--output-format',
      'json',
    ]);
  });

  it('throws ClaudeRunError on non-zero exit code with stderr captured', async () => {
    const { spawnFn } = makeSpawn(() =>
      makeFakeChild({ stderr: 'boom!', exitCode: 2 }),
    );

    await expect(
      runClaude({ prompt: 'hi', spawnFn }),
    ).rejects.toMatchObject({
      name: 'ClaudeRunError',
      details: { exitCode: 2, stderr: expect.stringContaining('boom!') },
    });
  });

  it('throws ClaudeRunError on timeout and kills the child', async () => {
    const { spawnFn, lastChild } = makeSpawn(() =>
      makeFakeChild({ neverClose: true }),
    );

    let caught: unknown;
    try {
      await runClaude({ prompt: 'hi', timeoutMs: 30, spawnFn });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ClaudeRunError);
    expect((caught as ClaudeRunError).message).toMatch(/timed out/i);
    expect(lastChild()?.killed).toBe(true);
  });

  it('throws ClaudeRunError when stdout is not valid JSON', async () => {
    const { spawnFn } = makeSpawn(() =>
      makeFakeChild({ stdout: 'not-json{', exitCode: 0 }),
    );

    let caught: unknown;
    try {
      await runClaude({ prompt: 'hi', spawnFn });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ClaudeRunError);
    expect((caught as ClaudeRunError).message).toMatch(/json/i);
  });

  it('throws ClaudeRunError when envelope has no string result field', async () => {
    const { spawnFn } = makeSpawn(() =>
      makeFakeChild({
        stdout: JSON.stringify({ notResult: 'oops' }),
        exitCode: 0,
      }),
    );

    let caught: unknown;
    try {
      await runClaude({ prompt: 'hi', spawnFn });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ClaudeRunError);
    expect((caught as ClaudeRunError).message).toMatch(/result/i);
  });
});
