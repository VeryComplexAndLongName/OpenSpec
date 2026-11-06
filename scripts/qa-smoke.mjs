#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const cli = path.join(repository, 'bin', 'openspec.js');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/qa-smoke.mjs [--artifacts <new-directory>]');
  process.exit(0);
}
assert(args.length === 0 || (args.length === 2 && args[0] === '--artifacts'), 'Unknown smoke option');
assert(fs.existsSync(path.join(repository, 'dist', 'cli', 'index.js')), 'Build first: pnpm run build');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
const artifacts = path.resolve(args[1] ?? path.join(repository, 'artifacts', 'qa-smoke', runId));
assert(!fs.existsSync(artifacts), 'Use a new artifacts directory; previous evidence is never overwritten');
fs.mkdirSync(artifacts, { recursive: true });
const coreSkills = ['propose', 'explore', 'apply-change', 'update-change', 'sync-specs', 'archive-change'];
const coreCommands = ['propose', 'explore', 'apply', 'update', 'sync', 'archive'];
const results = [];

function snapshot(directory) {
  const files = [];
  function visit(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(current, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(filename);
        files.push({ path: path.relative(directory, filename), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      }
    }
  }
  visit(directory);
  return files;
}

function fixture(name, config = { profile: 'core', delivery: 'both' }) {
  const root = path.join(artifacts, name);
  const project = path.join(root, 'project with spaces');
  const home = path.join(root, 'home');
  const configHome = path.join(root, 'config');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  const configFile = path.join(configHome, 'openspec', 'config.json');
  const env = {
    ...process.env,
    HOME: home, USERPROFILE: home,
    XDG_CONFIG_HOME: configHome, XDG_DATA_HOME: path.join(root, 'data'),
    APPDATA: path.join(home, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
    CODEX_HOME: path.join(home, '.codex'),
    OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1', CI: '1', NO_COLOR: '1',
  };
  let sequence = 0;
  function configure(value) {
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify({ ...value, telemetry: { enabled: false } }, null, 2));
  }
  configure(config);
  function run(label, command, expected = 0) {
    const prefix = path.join(root, String(++sequence).padStart(2, '0') + '-' + label);
    fs.writeFileSync(prefix + '-before.json', JSON.stringify(snapshot(project), null, 2));
    const result = spawnSync(process.execPath, [cli, ...command], { cwd: project, env, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    fs.writeFileSync(prefix + '-stdout.txt', result.stdout ?? '');
    fs.writeFileSync(prefix + '-stderr.txt', result.stderr ?? '');
    fs.writeFileSync(prefix + '-after.json', JSON.stringify(snapshot(project), null, 2));
    fs.writeFileSync(prefix + '-result.json', JSON.stringify({ command, status: result.status, signal: result.signal, error: result.error?.message }, null, 2));
    assert.equal(result.status, expected, `${label}: expected ${expected}, got ${result.status}: ${result.stderr ?? result.error ?? ''}`);
    return (result.stdout ?? '') + (result.stderr ?? '');
  }
  return { project, configure, configFile, run };
}

function exists(f, ...parts) { return fs.existsSync(path.join(f.project, ...parts)); }
function skills(f) {
  for (const workflow of coreSkills) assert(exists(f, '.claude', 'skills', 'openspec-' + workflow, 'SKILL.md'), `Missing skill ${workflow}`);
}
function commands(f) {
  for (const workflow of coreCommands) assert(exists(f, '.claude', 'commands', 'opsx', workflow + '.md'), `Missing command ${workflow}`);
}
function scenario(name, execute) {
  try { execute(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: String(error) }); console.error(`FAIL ${name}: ${error}`); }
}

scenario('core-output', () => {
  const f = fixture('core-output');
  f.run('init', ['init', '--tools', 'claude', '--force']);
  skills(f); commands(f);
  assert.equal(fs.readdirSync(path.join(f.project, '.claude', 'skills')).filter(n => n.startsWith('openspec-')).length, coreSkills.length);
  assert(exists(f, 'openspec', 'config.yaml'));
});
scenario('noninteractive-detection', () => {
  const f = fixture('noninteractive-detection');
  fs.mkdirSync(path.join(f.project, '.claude'));
  f.run('init-detected', ['init', '--force']);
  skills(f); commands(f);
});
scenario('profile-migration', () => {
  const f = fixture('profile-migration');
  f.run('initial-init', ['init', '--tools', 'claude', '--force']);
  f.configure({ delivery: 'both' });
  f.run('migrate', ['update', '--force']);
  assert(['core', 'custom'].includes(JSON.parse(fs.readFileSync(f.configFile, 'utf8')).profile));
  skills(f); commands(f);
});
for (const delivery of ['skills', 'commands']) {
  scenario('delivery-' + delivery, () => {
    const f = fixture('delivery-' + delivery);
    f.run('initial-init', ['init', '--tools', 'claude', '--force']);
    const keep = path.join(f.project, '.claude', 'commands', 'opsx', 'user-owned.md');
    fs.writeFileSync(keep, 'Owned by the user.\n');
    f.configure({ profile: 'core', delivery });
    f.run('update-delivery', ['update', '--force']);
    if (delivery === 'skills') {
      skills(f);
      for (const workflow of coreCommands) assert(!exists(f, '.claude', 'commands', 'opsx', workflow + '.md'));
    } else {
      commands(f);
      for (const workflow of coreSkills) assert(!exists(f, '.claude', 'skills', 'openspec-' + workflow, 'SKILL.md'));
    }
    assert.equal(fs.readFileSync(keep, 'utf8'), 'Owned by the user.\n');
  });
}
scenario('commands-only-detection', () => {
  const f = fixture('commands-only-detection', { profile: 'core', delivery: 'commands' });
  f.run('init', ['init', '--tools', 'claude', '--force']);
  const output = f.run('update', ['update', '--force']);
  assert(!output.includes('No configured tools found'));
  commands(f);
  assert(!exists(f, '.claude', 'skills', 'openspec-propose', 'SKILL.md'));
});
scenario('new-tool-notice', () => {
  const f = fixture('new-tool-notice');
  f.run('init', ['init', '--tools', 'claude', '--force']);
  fs.mkdirSync(path.join(f.project, '.cursor'));
  const output = f.run('update', ['update', '--force']);
  assert.match(output, /Detected new tool[^\n]*Cursor/);
  assert.match(output, /openspec init/);
  assert(!exists(f, '.cursor', 'skills', 'openspec-propose', 'SKILL.md'));
});
scenario('invalid-profile-no-writes', () => {
  const f = fixture('invalid-profile-no-writes');
  const before = snapshot(f.project);
  f.run('invalid-init', ['init', '--tools', 'claude', '--profile', 'not-a-profile', '--force'], 1);
  assert.deepEqual(snapshot(f.project), before);
});

const report = { runId, platform: process.platform, node: process.version, artifacts, results, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length };
fs.writeFileSync(path.join(artifacts, 'summary.json'), JSON.stringify(report, null, 2));
console.log(`QA artifacts: ${artifacts}`);
process.exitCode = report.failed ? 1 : 0;
