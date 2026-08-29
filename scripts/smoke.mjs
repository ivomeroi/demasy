import { spawn } from 'child_process';
import { get } from 'http';

const port = 8123;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
});

let serverOutput = '';
server.stdout.on('data', chunk => {
    serverOutput += chunk.toString();
});
server.stderr.on('data', chunk => {
    serverOutput += chunk.toString();
});

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function request(path) {
    return new Promise((resolve, reject) => {
        const req = get(`${baseUrl}${path}`, res => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({ status: res.statusCode, body });
            });
        });

        req.on('error', reject);
        req.setTimeout(3000, () => {
            req.destroy(new Error(`Timed out requesting ${path}`));
        });
    });
}

async function requestWithRetry(path) {
    let lastError;

    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            return await request(path);
        } catch (error) {
            lastError = error;
            await wait(100);
        }
    }

    throw lastError;
}

async function main() {
    try {
        const index = await requestWithRetry('/');
        if (index.status !== 200 || !index.body.includes('DEMASY')) {
            throw new Error('The app shell did not load correctly.');
        }

        const localAssets = [
            'styles.css',
            'core/demasy-config.js',
            'core/signal-source-contract.js',
            'core/recording-controller.js',
            'core/section-router.js',
            'services/analysis-service.js',
            'services/settings-service.js',
            'services/memory-storage-adapter.js',
            'services/replay-signal-source.js',
            'services/session-configuration-service.js',
        'services/data-normalization-service.js',
        'services/session-history-service.js',
            'database.js',
            'patient-manager.js',
            'analysis-manager.js',
            'emg-simulator.js',
            'serial-manager.js',
            'bluetooth-manager.js',
            'ai-assistant.js',
            'app.js',
            'database-init.js'
        ];

        for (const asset of localAssets) {
            const response = await request(`/${asset}`);
            if (response.status !== 200) {
                throw new Error(`${asset} returned HTTP ${response.status}`);
            }
        }

        const health = await request('/api/health');
        if (health.status !== 200 || !health.body.includes('geminiConfigured')) {
            throw new Error('/api/health did not return the expected response');
        }

        for (const route of ['/emg-en-vivo', '/analisis', '/pacientes', '/asistente-ia', '/configuracion']) {
            const response = await request(route);
            if (response.status !== 200 || !response.body.includes('DEMASY')) {
                throw new Error(`${route} did not return the app shell`);
            }
        }

        console.log(`Smoke check passed at ${baseUrl}`);
    } finally {
        server.kill('SIGTERM');
    }
}

main().catch(error => {
    server.kill('SIGTERM');
    console.error(error.message);
    if (serverOutput.trim()) {
        console.error(serverOutput.trim());
    }
    process.exit(1);
});
