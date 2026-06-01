import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const ignoredDirs = new Set(['.git', 'node_modules']);

function collectJavaScriptFiles(dir) {
    const entries = readdirSync(dir);
    const files = [];

    for (const entry of entries) {
        if (ignoredDirs.has(entry)) continue;

        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...collectJavaScriptFiles(fullPath));
        } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
            files.push(fullPath);
        }
    }

    return files;
}

const files = collectJavaScriptFiles(process.cwd());
let failed = false;

for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
