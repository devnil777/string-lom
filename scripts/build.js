const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'release';
const version = args.find(arg => arg.startsWith('--version='))?.split('=')[1] || '0.0.0';

const SRC_DIR = path.join(__dirname, '../src');
const DIST_DIR = path.join(__dirname, '../dist');
const PROJECT_ROOT = path.join(__dirname, '..');

const OPENGRAPH_TAGS = `
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://devnil777.github.io/string-lom/">
    <meta property="og:title" content="StringLOM — Визуальный конструктор текстовых цепочек">
    <meta property="og:description"
        content="StringLOM — визуальный конвейер для текста. Цепочки блоков: Regex, JSON, CSV, сортировка. Результат мгновенно, 100% в браузере.">
    <meta property="og:image" content="https://devnil777.github.io/string-lom/assets/web-app-manifest-512x512.png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://devnil777.github.io/string-lom/">
    <meta property="twitter:title" content="StringLOM — Визуальный конструктор текстовых цепочек">
    <meta property="twitter:description"
        content="StringLOM — визуальный конвейер для текста. Цепочки блоков: Regex, JSON, CSV, сортировка. Результат мгновенно, 100% в браузере.">
    <meta property="twitter:image" content="https://devnil777.github.io/string-lom/assets/web-app-manifest-512x512.png">
`;

function build() {
    console.log(`Building for mode: ${mode}, version: ${version}...`);

    // 1. Clean and create dist
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });

    // 2. Copy all files from src to dist
    fs.cpSync(SRC_DIR, DIST_DIR, { recursive: true });

    // 3. Copy README to dist
    fs.copyFileSync(path.join(PROJECT_ROOT, 'README.md'), path.join(DIST_DIR, 'README.md'));

    // 4. Process index.html
    let indexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');

    // Inject Version
    indexHtml = indexHtml.replace(/<!-- VERSION_PLACEHOLDER -->/g, version);

    // Inject Analytics if mode is pages
    if (mode === 'pages') {
        let analytics = '';
        const analyticsFile = path.join(PROJECT_ROOT, 'analytics-github.html');
        if (fs.existsSync(analyticsFile)) {
            analytics = fs.readFileSync(analyticsFile, 'utf8');
        }
        indexHtml = indexHtml.replace('<!-- ANALYTICS_PLACEHOLDER -->', analytics);
        indexHtml = indexHtml.replace('<!-- OPENGRAPH_PLACEHOLDER -->', OPENGRAPH_TAGS);
    } else {
        indexHtml = indexHtml.replace('<!-- ANALYTICS_PLACEHOLDER -->', '');
        indexHtml = indexHtml.replace('<!-- OPENGRAPH_PLACEHOLDER -->', '');
    }

    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);

    // 7. Create ZIP archive if mode is release
    if (mode === 'release') {
        const zipName = `string-lom-${version}.zip`;
        const zipPath = path.join(PROJECT_ROOT, 'release', zipName);

        if (!fs.existsSync(path.join(PROJECT_ROOT, 'release'))) {
            fs.mkdirSync(path.join(PROJECT_ROOT, 'release'));
        }

        console.log(`Creating ZIP: ${zipName}...`);

        // Use PowerShell on Windows for zipping if possible, or assume 'zip' in CI
        try {
            if (process.platform === 'win32') {
                execSync(`powershell -Command "Compress-Archive -Path '${DIST_DIR}\\*' -DestinationPath '${zipPath}' -Force"`);
            } else {
                execSync(`cd dist && zip -r ../release/${zipName} .`);
            }
            console.log(`Zip created at: ${zipPath}`);
        } catch (err) {
            console.error('Failed to create zip:', err.message);
        }
    }

    console.log('Build completed successfully.');
}

build();
