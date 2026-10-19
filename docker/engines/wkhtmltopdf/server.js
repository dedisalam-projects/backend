const http = require('http');
const { spawn } = require('child_process');

/**
 * pdf-wkhtmltopdf Microservice Daemon
 *
 * Dedicated zero-disk-IO streaming microservice for Gojek receipts and HTML-to-PDF rendering.
 * Runs on port 8082 with subpixel parity against Qt 4.8.7 WebKit / wkhtmltopdf 0.12.6.1.
 */

const PORT = parseInt(process.env.PORT || '8082', 10);

const server = http.createServer((req, res) => {
    // Healthcheck endpoint
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            engine: 'wkhtmltopdf 0.12.6.1',
            service: 'pdf-wkhtmltopdf',
            uptime: process.uptime()
        }));
        return;
    }

    // Render endpoint
    if (req.method === 'POST' && req.url === '/render') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            try {
                const bodyStr = Buffer.concat(chunks).toString('utf8');
                let html = bodyStr;
                let dpi = '600';

                // Check if wrapped in JSON { html: "...", dpi: "..." }
                if (bodyStr.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(bodyStr);
                        if (parsed.html) html = parsed.html;
                        if (parsed.dpi) dpi = String(parsed.dpi);
                    } catch (e) {
                        // Raw HTML string that happened to start with {
                    }
                }

                const args = [
                    '-s', 'A4',
                    '-T', '0',
                    '-B', '0',
                    '-L', '0',
                    '-R', '0',
                    '--dpi', dpi,
                    '--quiet',
                    '--enable-local-file-access',
                    '-', '-'
                ];

                const proc = spawn('wkhtmltopdf', args);

                res.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'inline; filename="receipt.pdf"'
                });

                proc.stdout.pipe(res);
                proc.stdin.end(html);

                proc.on('error', (err) => {
                    console.error('[pdf-wkhtmltopdf Error]', err);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: err.message }));
                    }
                });

                proc.stderr.on('data', (data) => {
                    const msg = data.toString();
                    if (!msg.includes('Warning:')) {
                        console.warn('[pdf-wkhtmltopdf warn]', msg.trim());
                    }
                });
            } catch (err) {
                console.error('[pdf-wkhtmltopdf Handler Error]', err);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found. Use GET /health or POST /render.' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[pdf-wkhtmltopdf] Microservice listening on port ${PORT}...`);
});
