"""Local portfolio server. The editor is available only on loopback."""
import json
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import Lock
from urllib.parse import parse_qs, quote, urlsplit
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / '.portfolio-published.json'
MEDIA = ROOT.parent / '.portfolio-media'
MEDIA_TYPES = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.pdf': 'application/pdf', '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain', '.odt': 'application/vnd.oasis.opendocument.text',
}
MEDIA_LIMIT = 50 * 1024 * 1024
LOCK = Lock()


def valid_media_id(value):
    return (isinstance(value, str) and re.fullmatch(r'[a-f0-9]{32}\.[a-z]+', value)
            and Path(value).suffix in MEDIA_TYPES)

ORIGIN = 'http://127.0.0.1:4173'
SECTIONS = {'profile', 'projects', 'blogs', 'writeups', 'achievements', 'career', 'background', 'toolkit', 'github', 'contact', 'sections'}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def allowed_host(self):
        if self.headers.get('Host') != '127.0.0.1:4173':
            self.send_error(403)
            return False
        return True

    def reply(self, value):
        body = json.dumps(value).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.allowed_host():
            return
        path = urlsplit(self.path).path
        if path.startswith('/media/'):
            self.serve_media(path.removeprefix('/media/'))
            return
        if path == '/api/content':
            with LOCK:
                content = json.loads(DATA.read_text()) if DATA.exists() else []
            self.reply(content)
        else:
            super().do_GET()

    def do_POST(self):
        if not self.allowed_host():
            return
        if urlsplit(self.path).path == '/api/media':
            self.upload_media()
            return
        if self.path != '/api/content':
            self.send_error(404)
            return
        if self.headers.get('Origin') != ORIGIN or self.headers.get_content_type() != 'application/json':
            self.send_error(403)
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 150_000:
                raise ValueError
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict):
                raise ValueError
            draft = payload.get('draft')
            action = payload.get('action')
            if not isinstance(draft, dict) or action not in ('publish', 'unpublish'):
                raise ValueError
            fields = {'id': 100, 'section': 30, 'title': 120, 'body': 50_000, 'url': 2048, 'platform': 40, 'role': 120, 'github': 300}
            entry = {key: draft.get(key, '') for key in fields}
            if any(not isinstance(value, str) or len(value) > fields[key] for key, value in entry.items()):
                raise ValueError
            if entry['section'] not in SECTIONS or not entry['id'] or not entry['title'].strip():
                raise ValueError
            media = draft.get('media', [])
            if not isinstance(media, list) or len(media) > 20:
                raise ValueError
            entry['media'] = []
            for item in media:
                if not isinstance(item, dict):
                    raise ValueError
                media_id, name = item.get('id'), item.get('name')
                if not valid_media_id(media_id) or not (MEDIA / media_id).is_file():
                    raise ValueError
                if not isinstance(name, str) or not 0 < len(name) <= 255:
                    raise ValueError
                entry['media'].append({'id': media_id, 'name': name})
            if entry['section'] == 'sections' and not re.fullmatch(r'[a-zA-Z0-9-]+', entry['id']):
                raise ValueError
            if entry['url']:
                url = urlsplit(entry['url'])
                if url.scheme not in ('https', 'http') or not url.hostname:
                    raise ValueError
            if entry['github']:
                github = urlsplit(entry['github'])
                if github.scheme not in ('https', 'http') or not github.hostname:
                    raise ValueError
            if entry['section'] == 'writeups' and entry['platform'] not in ('Hack The Box', 'TryHackMe'):
                raise ValueError
        except (ValueError, UnicodeError):
            self.send_error(400, 'Invalid portfolio entry')
            return
        with LOCK:
            content = json.loads(DATA.read_text()) if DATA.exists() else []
            position = next((i for i, item in enumerate(content) if item['id'] == entry['id']), len(content))
            content = [item for item in content if item['id'] != entry['id']]
            if action == 'publish':
                if entry['section'] in ('profile', 'contact'):
                    content = [item for item in content if item['section'] != entry['section']]
                content.insert(position, entry)
            with NamedTemporaryFile(mode='w', dir=DATA.parent, delete=False) as output:
                json.dump(content, output, indent=2)
                temporary = output.name
            os.replace(temporary, DATA)
        self.reply(content)

    def upload_media(self):
        if self.headers.get('Origin') != ORIGIN or self.headers.get_content_type() != 'application/octet-stream':
            self.send_error(403)
            return
        name = parse_qs(urlsplit(self.path).query).get('name', [''])[0]
        suffix = Path(name).suffix.lower()
        try:
            size = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            size = 0
        if suffix not in MEDIA_TYPES or not 0 < len(name) <= 255:
            self.send_error(415, 'Unsupported media format')
            return
        if not 0 < size <= MEDIA_LIMIT:
            self.send_error(413, 'File must be between 1 byte and 50 MB')
            return
        MEDIA.mkdir(exist_ok=True, mode=0o700)
        media_id = uuid4().hex + suffix
        temporary = None
        try:
            with NamedTemporaryFile(dir=MEDIA, delete=False) as output:
                temporary = Path(output.name)
                while size:
                    chunk = self.rfile.read(min(size, 65536))
                    if not chunk:
                        raise ValueError('Incomplete upload')
                    output.write(chunk)
                    size -= len(chunk)
            temporary.replace(MEDIA / media_id)
        except (OSError, ValueError):
            if temporary is not None:
                temporary.unlink(missing_ok=True)
            self.send_error(400, 'Could not save upload')
            return
        self.reply({'id': media_id, 'name': name})

    def serve_media(self, media_id):
        if not valid_media_id(media_id):
            self.send_error(404)
            return
        with LOCK:
            content = json.loads(DATA.read_text()) if DATA.exists() else []
            attachment = next((item for entry in content for item in entry.get('media', [])
                               if item['id'] == media_id), None)
        file = MEDIA / media_id
        if attachment is None or not file.is_file():
            self.send_error(404)
            return
        content_type = MEDIA_TYPES[file.suffix]
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(file.stat().st_size))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        if not content_type.startswith(('image/', 'video/')):
            self.send_header('Content-Disposition', "attachment; filename*=UTF-8''" + quote(attachment['name'], safe=''))
        self.end_headers()
        with file.open('rb') as source:
            self.copyfile(source, self.wfile)


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 4173), Handler).serve_forever()
