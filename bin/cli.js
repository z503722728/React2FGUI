#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const mainPath = path.join(__dirname, 'main.js');
const args = process.argv.slice(2);

const result = spawnSync('node', [mainPath, ...args], { stdio: 'inherit' });
process.exit(result.status);
