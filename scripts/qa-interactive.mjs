#!/usr/bin/env node
import * as fs from 'node:fs';
console.log(fs.readFileSync(new URL('../docs/qa-interactive.md', import.meta.url), 'utf8'));
