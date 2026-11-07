#!/usr/bin/env python3
"""Serve the local game. No third-party Python packages required."""
import argparse
import functools
import http.server
from pathlib import Path
import socket
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, fmt, *args):
        if str(args[1] if len(args) > 1 else '').startswith(('4', '5')):
            super().log_message(fmt, *args)

def main():
    parser = argparse.ArgumentParser(description='借光 · 珞珈夜戏 本地预览')
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    handler = functools.partial(Handler, directory=str(ROOT))
    port = args.port
    for _ in range(20):
        try:
            server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
            break
        except OSError:
            port += 1
    else:
        raise SystemExit('没有可用端口，请使用 --port 指定其他端口。')
    url = f'http://127.0.0.1:{port}/'
    print(f'借光 · 珞珈夜戏\nLocal: {url}\n按 Control+C 关闭预览。', flush=True)
    if args.open:
        threading.Timer(.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n戏台已暂时收起。')
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
