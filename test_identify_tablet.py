import urllib.request
import uuid

path = 'frontend/src/assets/hero.png'
with open(path, 'rb') as f:
    data = f.read()

boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
parts = []
parts.append(('--' + boundary + '\r\n').encode())
parts.append(b'Content-Disposition: form-data; name="file"; filename="hero.png"\r\n')
parts.append(b'Content-Type: image/png\r\n\r\n')
parts.append(data)
parts.append(b'\r\n')
parts.append(('--' + boundary + '--\r\n').encode())
body = b''.join(parts)

req = urllib.request.Request('http://localhost:8000/identify-tablet', data=body, method='POST')
req.add_header('Content-Type', 'multipart/form-data; boundary=' + boundary)
req.add_header('Content-Length', str(len(body)))

try:
    resp = urllib.request.urlopen(req, timeout=20)
    print('STATUS', resp.status)
    print(resp.read(1000).decode('utf-8', errors='replace'))
except Exception as e:
    print('ERROR', repr(e))
