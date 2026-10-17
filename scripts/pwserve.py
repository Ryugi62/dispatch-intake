"""검증·촬영용 임시 서버: 127.0.0.1 루프백 전용, 컨텍스트가 끝나면 스스로 닫는다."""
import contextlib, functools, http.server, threading, os

@contextlib.contextmanager
def serve(root=None, port=8765):
    root = root or os.path.join(os.path.dirname(__file__), '..')
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
    handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(_H, directory=root))
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    try:
        yield f'http://127.0.0.1:{port}'
    finally:
        srv.shutdown(); srv.server_close()

class _H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript'}
    def log_message(self, *a, **k):
        pass
