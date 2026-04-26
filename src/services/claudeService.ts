import {
  spawn as nodeSpawn,
  type ChildProcess,
} from 'node:child_process';

export interface SpawnFn {
  (command: string, args: readonly string[]): ChildProcess;
}

export interface RunClaudeOptions {
  prompt: string;
  outputFormat?: string;
  timeoutMs?: number;
  spawnFn?: SpawnFn;
}

export interface RunClaudeResult {
  result: string;
  raw: unknown;
}

export interface ClaudeRunErrorDetails {
  exitCode?: number | null;
  stderr?: string;
  stdout?: string;
  cause?: unknown;
}

export class ClaudeRunError extends Error {
  readonly details: ClaudeRunErrorDetails;

  constructor(message: string, details: ClaudeRunErrorDetails = {}) {
    super(message);
    this.name = 'ClaudeRunError';
    this.details = details;
  }
}

export async function runClaude({
  prompt,
  outputFormat = 'json',
  timeoutMs = 120_000,
  spawnFn,
}: RunClaudeOptions): Promise<RunClaudeResult> {
  const bin = process.env.CLAUDE_BIN ?? 'claude';
  const spawnImpl: SpawnFn =
    spawnFn ?? ((cmd, args) => nodeSpawn(cmd, [...args]));

  return await new Promise<RunClaudeResult>((resolve, reject) => {
    const child = spawnImpl(bin, [
      '-p',
      prompt,
      '--output-format',
      outputFormat,
    ]);

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finalize = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore kill errors; we are already failing
      }
      finalize(() =>
        reject(
          new ClaudeRunError(`claude timed out after ${timeoutMs}ms`, {
            stderr,
            stdout,
          }),
        ),
      );
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      finalize(() =>
        reject(
          new ClaudeRunError(`failed to spawn claude: ${err.message}`, {
            cause: err,
            stderr,
            stdout,
          }),
        ),
      );
    });

    child.on('close', (code) => {
      finalize(() => {
        if (code !== 0) {
          reject(
            new ClaudeRunError(`claude exited with code ${code}`, {
              exitCode: code,
              stderr,
              stdout,
            }),
          );
          return;
        }

        let raw: unknown;
        try {
          raw = JSON.parse(stdout);
        } catch (err) {
          reject(
            new ClaudeRunError(
              'claude stdout is not a valid JSON envelope',
              { stdout, stderr, cause: err },
            ),
          );
          return;
        }

        const candidate = (raw as { result?: unknown }).result;
        if (typeof candidate !== 'string') {
          reject(
            new ClaudeRunError(
              'claude envelope is missing a string "result" field',
              { stdout, stderr },
            ),
          );
          return;
        }

        resolve({ result: candidate, raw });
      });
    });
  });
}
