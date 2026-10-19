import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import weasyprint

PORT = int(os.environ.get('PORT', 8083))

class WeasyPrintHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            resp = json.dumps({
                "status": "ok",
                "engine": f"WeasyPrint {weasyprint.__version__}",
                "service": "pdf-weasyprint"
            })
            self.wfile.write(resp.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/render':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len).decode('utf-8')

                html_content = body
                if body.strip().startswith('{'):
                    try:
                        parsed = json.loads(body)
                        if 'html' in parsed:
                            html_content = parsed['html']
                    except Exception:
                        pass

                # Render HTML to PDF in-memory via WeasyPrint
                doc = weasyprint.HTML(string=html_content)
                pdf_bytes = doc.write_pdf()

                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Disposition', 'inline; filename="receipt.pdf"')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.end_headers()
                self.wfile.write(pdf_bytes)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                err = json.dumps({"error": str(e)})
                self.wfile.write(err.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Concise logging
        print(f"[pdf-weasyprint] {args[0]} - {args[1]} {args[2]}")

def run():
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, WeasyPrintHandler)
    print(f"[pdf-weasyprint] Microservice listening on port {PORT} with WeasyPrint {weasyprint.__version__}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
