import { readFile } from 'node:fs/promises';
import { decision } from './policy.mjs';

const EXAMPLES = ['routing', 'ranking', 'tools', 'workflow', 'risk', 'verify'];

const [example, mode, ...extra] = process.argv.slice(2);
if (!EXAMPLES.includes(example) || !['--dry-run', '--live'].includes(mode) || extra.length) {
  console.error(`Usage: node run.mjs ${EXAMPLES.join('|')} --dry-run|--live`);
  process.exit(2);
}

const request = JSON.parse(await readFile(new URL(`./requests/${example}.json`, import.meta.url), 'utf8'));
if (mode === '--dry-run') {
  console.log(JSON.stringify(request, null, 2));
} else {
  // Provider selection: explicit JEV_PROVIDER wins; TypeSafe if its key is set (default,
  // unchanged); OpenJEV if only OPENJEV_API_KEY is set. Anyone with a TypeSafe key sees
  // zero behaviour change.
  const provider = process.env.JEV_PROVIDER
    ?? (process.env.TYPESAFE_API_KEY ? 'typesafe'
      : process.env.OPENJEV_API_KEY ? 'openjev' : null);
  if (!provider) {
    console.error('Set TYPESAFE_API_KEY (or OPENJEV_API_KEY) in the environment, or load it with node --env-file.');
    process.exitCode = 2;
  } else if (provider === 'openjev') {
    try {
      const started = performance.now();
      const response = await fetch('https://api.openjev.sh/v1/systemone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENJEV_API_KEY}` },
        body: JSON.stringify({ ...request, model: 'openjev' }),
      });
      if (!response.ok) {
        const retryAfter = response.headers.get('Retry-After');
        console.error(`OpenJEV request failed (${response.status}).${retryAfter ? ` Retry after ${retryAfter}s.` : ''} No action was taken.`);
        process.exitCode = 1;
      } else {
        const result = await response.json();
        const policy = decision(example, request, result.answers);
        console.log(JSON.stringify({
          model: result.model, milliseconds: Math.round(performance.now() - started),
          usage: result.usage, answers: result.answers, policy,
        }, null, 2));
      }
    } catch (error) {
      // Provider errors may include input text: print only a controlled message.
      console.error('The request or response failed. Keep the existing fallback; no action was taken.');
      process.exitCode = 1;
    }
  } else {
    try {
      const { TypeSafeClient } = await import('@typesafe-ai/sdk');
      const client = new TypeSafeClient({
        baseURL: 'https://api.typesafe.ai', logLevel: 'off', timeout: 30_000,
        retry: { maxRetries: 0 },
      });
      const started = performance.now();
      const result = await client.systemOne(request);
      const policy = decision(example, request, result.answers);
      console.log(JSON.stringify({
        model: result.model, milliseconds: Math.round(performance.now() - started),
        usage: result.usage, answers: result.answers, policy,
      }, null, 2));
    } catch (error) {
      // Provider errors may include input text: print only a controlled message.
      console.error(error.code === 'ERR_MODULE_NOT_FOUND'
        ? 'Install dependencies in examples/decisions first: npm install'
        : 'The request or response failed. Keep the existing fallback; no action was taken.');
      process.exitCode = 1;
    }
  }
}
