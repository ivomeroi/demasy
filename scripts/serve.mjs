import { createServer } from 'http';
import { createReadStream, readFileSync, statSync } from 'fs';
import { extname, join, normalize, resolve, sep } from 'path';

const root = process.cwd();

loadEnvFile('.env');
loadEnvFile('.env.local');

const host = process.env.HOST || '127.0.0.1';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: npm start -- [port]');
    console.log('Environment: PORT=8000 HOST=127.0.0.1');
    process.exit(0);
}

const portArg = process.argv.find(arg => /^\d+$/.test(arg));
const port = Number(process.env.PORT || portArg || 8000);
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const assistantMode = 'remote';
const assistantContextPath = join(root, 'docs', 'ai-assistant-context.md');
const chartAssetPath = join(root, 'node_modules', 'chart.js', 'dist', 'chart.min.js');
const fontAwesomePath = join(root, 'node_modules', '@fortawesome', 'fontawesome-free');
const appRoutes = new Set(['/emg-en-vivo', '/analisis', '/pacientes', '/asistente-ia', '/configuracion']);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

function loadEnvFile(filename) {
    try {
        const envPath = join(root, filename);
        const contents = readFileSync(envPath, 'utf8');

        for (const line of contents.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1) continue;

            const key = trimmed.slice(0, separatorIndex).trim();
            const rawValue = trimmed.slice(separatorIndex + 1).trim();
            const value = rawValue.replace(/^['"]|['"]$/g, '');

            if (key && process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    } catch {
        // Optional local env file.
    }
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
    res.writeHead(status, { ...securityHeaders(), 'Content-Type': type });
    res.end(body);
}

function securityHeaders() {
    return {
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
}

function sendJson(res, status, body) {
    send(res, status, JSON.stringify(body), 'application/json; charset=utf-8');
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 100_000) {
                reject(new Error('Request body too large'));
                req.destroy();
            }
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

function getAssistantContext() {
    try {
        return readFileSync(assistantContextPath, 'utf8');
    } catch {
        return 'You are the assistant for DEMASY. Give cautious educational EMG guidance.';
    }
}

function redactAssistantText(value) {
    return String(value ?? '')
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[correo omitido]')
        .replace(/\+?\d[\d\s().-]{7,}\d/g, '[teléfono omitido]');
}

function sanitizeAssistantContext(context) {
    const allowed = new Set(['activity', 'muscle', 'cadence', 'resistance', 'rms', 'mav', 'peakAmplitude', 'peakToPeak', 'waveformLength', 'zeroCrossings', 'entropy', 'frequency', 'snr', 'artifacts', 'symmetryIndex', 'difference', 'activationLevel', 'quality', 'left', 'right', 'bilateral', 'cycling', 'pedalingEfficiency', 'powerImbalance']);
    const visit = value => {
        if (Array.isArray(value)) return value.slice(0, 50).map(visit);
        if (!value || typeof value !== 'object') return typeof value === 'string' ? redactAssistantText(value).slice(0, 120) : value;
        return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key)).map(([key, child]) => [key, visit(child)]));
    };
    return visit(context || {});
}

function buildGeminiContents({ message, emgContext, history }) {
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    const conversationText = recentHistory
        .map(entry => `${entry.type === 'assistant' ? 'Assistant' : 'User'}: ${redactAssistantText(entry.content).slice(0, 1200)}`)
        .join('\n');

    return [{
        role: 'user',
        parts: [{
            text: [
                getAssistantContext(),
                '',
                'Current app/EMG context JSON:',
                JSON.stringify(sanitizeAssistantContext(emgContext), null, 2),
                '',
                conversationText ? `Recent conversation:\n${conversationText}\n` : '',
                `User question: ${redactAssistantText(message).slice(0, 2000)}`
            ].join('\n')
        }]
    }];
}

async function handleChat(req, res) {
    if (!process.env.GEMINI_API_KEY) {
        sendJson(res, 503, {
            error: 'GEMINI_API_KEY is not configured'
        });
        return;
    }

    try {
        const body = JSON.parse(await readRequestBody(req) || '{}');
        const message = String(body.message || '').trim();

        if (!message) {
            sendJson(res, 400, { error: 'Missing message' });
            return;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: buildGeminiContents(body),
                generationConfig: {
                    temperature: 0.35,
                    topP: 0.9,
                    maxOutputTokens: 700
                }
            })
        });

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            const retryAfterHeader = geminiResponse.headers.get('retry-after');
            const retryDelay = data.error?.details
                ?.find(detail => detail['@type']?.endsWith('RetryInfo'))?.retryDelay;
            const retryAfterSeconds = retryAfterHeader
                ? Number.parseInt(retryAfterHeader, 10)
                : retryDelay?.endsWith('s') ? Math.ceil(Number.parseFloat(retryDelay)) : null;
            sendJson(res, geminiResponse.status, {
                error: data.error?.message || 'Gemini request failed',
                code: geminiResponse.status === 429 ? 'RATE_LIMIT' : 'REMOTE_ERROR',
                retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null
            });
            return;
        }

        const text = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || '')
            .join('')
            .trim();

        if (!text) {
            sendJson(res, 502, { error: 'Gemini returned an empty response' });
            return;
        }

        sendJson(res, 200, {
            response: text,
            model: geminiModel
        });
    } catch (error) {
        sendJson(res, 500, {
            error: error.message || 'Unexpected chat error'
        });
    }
}

function resolveRequestPath(urlPath) {
    let decodedPath;
    try { decodedPath = decodeURIComponent(urlPath.split('?')[0]); }
    catch { return null; }
    const segments = decodedPath.split(/[\\/]+/).filter(Boolean);
    if (segments.some(segment => segment.startsWith('.') || segment === 'node_modules') || decodedPath.includes('\0')) return null;
    const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
    const requestedPath = resolve(join(root, normalizedPath));

    if (requestedPath !== root && !requestedPath.startsWith(`${root}${sep}`)) {
        return null;
    }

    return requestedPath;
}

function resolveFontAwesomePath(pathname) {
    const prefix = '/vendor/fontawesome/';
    if (!pathname.startsWith(prefix)) return null;
    const relativePath = pathname.slice(prefix.length);
    if (!relativePath || relativePath.split('/').some(segment => !segment || segment.startsWith('.'))) return null;
    const requestedPath = resolve(fontAwesomePath, relativePath);
    return requestedPath.startsWith(`${fontAwesomePath}${sep}`) ? requestedPath : null;
}

const server = createServer(async (req, res) => {
    if (req.url === '/api/health' && req.method === 'GET') {
        sendJson(res, 200, {
            ok: true,
            geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
            model: geminiModel,
            assistantMode
        });
        return;
    }

    if (req.url === '/api/chat' && req.method === 'POST') {
        await handleChat(req, res);
        return;
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
        send(res, 405, 'Method not allowed');
        return;
    }

    const rawPathname = new URL(req.url || '/', 'http://localhost').pathname;
    const requestPathname = rawPathname.replace(/\/+$/, '') || '/';
    let filePath = requestPathname === '/vendor/chart.min.js'
        ? chartAssetPath
        : resolveFontAwesomePath(requestPathname) || resolveRequestPath(req.url || '/');

    if (!filePath) {
        send(res, 403, 'Forbidden');
        return;
    }

    try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
            filePath = join(filePath, 'index.html');
        }
    } catch {
        if (appRoutes.has(requestPathname)) filePath = join(root, 'index.html');
        else {
            send(res, 404, 'Not found');
            return;
        }
    }

    try {
        const stat = statSync(filePath);
        const contentType = contentTypes[extname(filePath)] || 'application/octet-stream';
        res.writeHead(200, {
            ...securityHeaders(),
            'Content-Length': stat.size,
            'Content-Type': contentType
        });

        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        createReadStream(filePath).pipe(res);
    } catch {
        send(res, 404, 'Not found');
    }
});

server.listen(port, host, () => {
    console.log(`DEMASY is running at http://${host}:${port}`);
    console.log(`AI assistant: ${assistantMode}; ${process.env.GEMINI_API_KEY ? `Gemini enabled (${geminiModel})` : 'GEMINI_API_KEY missing'}`);
    console.log('Press Ctrl+C to stop the server.');
});

server.on('error', error => {
    console.error(`Unable to start server on ${host}:${port}: ${error.message}`);
    process.exit(1);
});
