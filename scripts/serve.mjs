import { createServer } from 'http';
import { createReadStream, readFileSync, statSync } from 'fs';
import { extname, join, normalize, resolve } from 'path';

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
const assistantContextPath = join(root, 'docs', 'ai-assistant-context.md');
const appRoutes = new Set(['/emg-en-vivo', '/analisis', '/pacientes', '/asistente-ia', '/configuracion']);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.svg': 'image/svg+xml'
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
    res.writeHead(status, { 'Content-Type': type });
    res.end(body);
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

function buildGeminiContents({ message, emgContext, history }) {
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    const conversationText = recentHistory
        .map(entry => `${entry.type === 'assistant' ? 'Assistant' : 'User'}: ${entry.content}`)
        .join('\n');

    return [{
        role: 'user',
        parts: [{
            text: [
                getAssistantContext(),
                '',
                'Current app/EMG context JSON:',
                JSON.stringify(emgContext || {}, null, 2),
                '',
                conversationText ? `Recent conversation:\n${conversationText}\n` : '',
                `User question: ${message}`
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
            sendJson(res, geminiResponse.status, {
                error: data.error?.message || 'Gemini request failed'
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
    const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
    const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
    const requestedPath = resolve(join(root, normalizedPath));

    if (!requestedPath.startsWith(root)) {
        return null;
    }

    return requestedPath;
}

const server = createServer(async (req, res) => {
    if (req.url === '/api/health' && req.method === 'GET') {
        sendJson(res, 200, {
            ok: true,
            geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
            model: geminiModel
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
    let filePath = resolveRequestPath(req.url || '/');

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
    console.log(`AI assistant: ${process.env.GEMINI_API_KEY ? `Gemini enabled (${geminiModel})` : 'offline fallback only'}`);
    console.log('Press Ctrl+C to stop the server.');
});

server.on('error', error => {
    console.error(`Unable to start server on ${host}:${port}: ${error.message}`);
    process.exit(1);
});
