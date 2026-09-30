import { readFileSync } from 'node:fs';

const templateFiles = [
    'index.html',
    'app.js',
    'controllers/recording-workflow-controller.js',
    'analysis-manager.js',
    'backup-manager.js',
    'patient-manager.js',
    'services/onboarding-tour.js'
];
const templates = templateFiles.map(path => ({ path, source: readFileSync(path, 'utf8') }));
const html = templates[0].source;
const stylesheetPaths = ['styles/base.css', 'styles/dashboard.css', 'styles/features.css'];
const css = stylesheetPaths.map(path => readFileSync(path, 'utf8')).join('');
const controllerScriptPaths = [
    'app.js',
    'controllers/live-chart-controller.js',
    'controllers/device-connection-controller.js',
    'controllers/recording-workflow-controller.js',
    'controllers/signal-processing-controller.js',
    'bootstrap.js',
    'database-init.js'
];
const runtimeLogFiles = [
    'app.js',
    'controllers/live-chart-controller.js',
    'controllers/device-connection-controller.js',
    'controllers/recording-workflow-controller.js',
    'controllers/signal-processing-controller.js',
    'bootstrap.js',
    'emg-simulator.js',
    'database.js',
    'database-init.js',
    'patient-manager.js',
    'analysis-manager.js',
    'backup-manager.js',
    'bluetooth-manager.js',
    'serial-manager.js',
    'ai-assistant.js'
];
const failures = [];

function assert(condition, message) {
    if (!condition) failures.push(message);
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicateIds.length === 0, `IDs duplicados: ${duplicateIds.join(', ')}`);

const buttons = templates.flatMap(({ path, source }) => (
    [...source.matchAll(/<button\b[^>]*>/g)].map(match => ({ path, tag: match[0] }))
));
const buttonsWithoutType = buttons.filter(({ tag }) => !/\btype="(?:button|submit|reset)"/.test(tag));
const buttonFiles = [...new Set(buttonsWithoutType.map(({ path }) => path))];
assert(
    buttonsWithoutType.length === 0,
    `${buttonsWithoutType.length} botones sin un type explícito en: ${buttonFiles.join(', ')}`
);
const buttonsWithDuplicateType = buttons.filter(({ tag }) => (tag.match(/\btype=/g) || []).length > 1);
assert(buttonsWithDuplicateType.length === 0, `${buttonsWithDuplicateType.length} botones con type duplicado`);

const images = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
const imagesWithoutAlt = images.filter(image => !/\balt="[^"]*"/.test(image));
assert(imagesWithoutAlt.length === 0, `${imagesWithoutAlt.length} imágenes sin texto alternativo`);

const canvases = [...html.matchAll(/<canvas\b([^>]*)>([\s\S]*?)<\/canvas>/g)];
const inaccessibleCanvases = canvases.filter(([, attributes, fallback]) => (
    !/\brole="img"/.test(attributes)
    || !/\baria-label="[^"]+"/.test(attributes)
    || fallback.trim().length === 0
));
assert(inaccessibleCanvases.length === 0, `${inaccessibleCanvases.length} gráficos canvas sin nombre o contenido alternativo`);

assert(/<html\b[^>]*\blang="es"/.test(html), 'El documento principal debe declarar lang="es"');
assert(!/transition:\s*all\b/.test(css), 'Evita transition: all; declara únicamente las propiedades animadas');
let previousStylesheetIndex = -1;
for (const path of stylesheetPaths) {
    const stylesheetIndex = html.indexOf(`href="${path}`);
    assert(stylesheetIndex > previousStylesheetIndex, `Falta ${path} o está fuera del orden de cascada esperado`);
    previousStylesheetIndex = stylesheetIndex;
}

let previousScriptIndex = -1;
for (const path of controllerScriptPaths) {
    const scriptIndex = html.indexOf(`src="${path}`);
    assert(scriptIndex > previousScriptIndex, `Falta ${path} o está fuera del orden de carga esperado`);
    previousScriptIndex = scriptIndex;
}

const noisyRuntimeFiles = runtimeLogFiles.filter(path => /console\.log\s*\(/.test(readFileSync(path, 'utf8')));
assert(
    noisyRuntimeFiles.length === 0,
    `Usa DemasyLogger para el diagnóstico de producción: ${noisyRuntimeFiles.join(', ')}`
);
const broadTransitionFiles = runtimeLogFiles.filter(path => /transition:\s*all\b/.test(readFileSync(path, 'utf8')));
assert(
    broadTransitionFiles.length === 0,
    `Evita transition: all en estilos generados desde JavaScript: ${broadTransitionFiles.join(', ')}`
);

if (failures.length > 0) {
    console.error('Static quality checks failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log(`Checked static markup and styles: ${ids.length} IDs, ${buttons.length} buttons, ${canvases.length} canvases.`);
