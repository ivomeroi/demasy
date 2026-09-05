import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const runtimeFiles = [
    'index.html', 'styles.css', 'service-worker.js', 'DEMASY-LOGO.jpeg',
    'ai-assistant.js', 'analysis-manager.js', 'app.js', 'backup-manager.js',
    'bluetooth-manager.js', 'database-init.js', 'database.js',
    'emg-simulator.js', 'patient-manager.js', 'serial-manager.js'
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of runtimeFiles) {
    await cp(join(root, file), join(output, file));
}

await cp(join(root, 'core'), join(output, 'core'), { recursive: true });
await cp(join(root, 'services'), join(output, 'services'), { recursive: true });
await mkdir(join(output, 'vendor', 'fontawesome'), { recursive: true });
await cp(
    join(root, 'node_modules', 'chart.js', 'dist', 'chart.min.js'),
    join(output, 'vendor', 'chart.min.js')
);
await cp(
    join(root, 'node_modules', '@fortawesome', 'fontawesome-free', 'css'),
    join(output, 'vendor', 'fontawesome', 'css'),
    { recursive: true }
);
await cp(
    join(root, 'node_modules', '@fortawesome', 'fontawesome-free', 'webfonts'),
    join(output, 'vendor', 'fontawesome', 'webfonts'),
    { recursive: true }
);

console.log('DEMASY static bundle created in dist/.');
