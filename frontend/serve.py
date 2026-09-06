#!/usr/bin/env python3
"""SPA-friendly static server: unknown routes fall back to index.html
so React Router deep links (/farmer, /b2b, ...) work on refresh."""
import http.server
import os
import socketserver

PORT = int(os.environ.get("PORT", "5173"))
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # allow the cross-origin tunnel backend to be called from here
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = self.translate_path(self.path)
        # if the requested file doesn't exist and it's not an asset, serve index.html
        if not os.path.exists(path) and not self.path.startswith("/assets"):
            self.path = "/index.html"
        return super().do_GET()


with socketserver.TCPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
    print(f"[spa-server] serving {DIRECTORY} on http://0.0.0.0:{PORT}")
    httpd.serve_forever()
