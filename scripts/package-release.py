#!/usr/bin/env python3
"""Build itch.io frontend, standalone Worker, and matching source archives without player data."""
import argparse, hashlib, json, re, subprocess, zipfile
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--ws', default='wss://ashfall-online.phuthanet9870.workers.dev/ws')
p.add_argument('--out', type=Path, default=ROOT / 'dist')
a = p.parse_args()
u = urlparse(a.ws)
if u.scheme not in ('ws', 'wss') or not u.hostname or u.username or u.password or u.fragment:
    p.error('--ws must be a WebSocket URL without embedded credentials')
if u.scheme != 'wss' and u.hostname not in ('localhost', '127.0.0.1', '::1'):
    p.error('public itch.io builds require wss://')
a.out.mkdir(parents=True, exist_ok=True)
config = ('// Generated itch.io build: HTTPS iframe connects to the configured online authority.\n'
          'window.ASHFALL_CFG = ' + json.dumps({'ws': a.ws, 'sharedWorld': True, 'noBots': True}) + ';\n')
frontend = a.out / 'ashfall-itch.zip'
with zipfile.ZipFile(frontend, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in sorted((ROOT / 'public').rglob('*')):
        if f.is_file():
            rel = f.relative_to(ROOT / 'public').as_posix()
            z.writestr(rel, config.encode() if rel == 'js/config.js' else f.read_bytes())
    names = set(z.namelist())
    assert 'index.html' in names
    html = (ROOT / 'public/index.html').read_text()
    for src in re.findall(r'<script[^>]+src=["\']([^"\']+)', html):
        if not src.startswith(('http:', 'https:', '//')):
            assert src.split('?')[0].lstrip('./') in names, 'missing script: ' + src
bundle = ROOT / '.wrangler/online-build/index.js'
if not bundle.is_file():
    raise SystemExit('Build Worker first: npx wrangler deploy --dry-run --outdir .wrangler/online-build')
worker = a.out / 'ashfall-worker.zip'
with zipfile.ZipFile(worker, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.writestr('worker.mjs', bundle.read_bytes())
    z.writestr('wrangler.toml', (ROOT / 'wrangler.toml').read_text().replace('main = "worker/index.mjs"', 'main = "worker.mjs"'))
    pkg = json.loads((ROOT / 'package.json').read_text())
    pkg['main'] = 'worker.mjs'
    pkg['scripts'] = {'deploy': 'wrangler deploy', 'dev': 'wrangler dev'}
    z.writestr('package.json', json.dumps(pkg, indent=2) + '\n')
    z.write(ROOT / 'package-lock.json', 'package-lock.json')
    z.writestr('README.txt', 'Ashfall Online backend (matching ashfall-itch.zip)\n\nNode.js 20+\n1. npm ci\n2. npx wrangler login\n3. npm run deploy\n\nUse the same Cloudflare account as the existing Worker to retain its storage.\nThe configured frontend expects: ' + a.ws + '\nIf your Worker URL differs, rebuild the frontend from the source archive:\npython3 scripts/package-release.py --ws wss://YOUR-WORKER.workers.dev/ws\n\nALLOW_LEGACY_IMPORT defaults to 1: import existing saves once, retaining items and levels.\nSet ALLOW_LEGACY_IMPORT = "0" under [vars] in wrangler.toml after migration.\nNever put Cloudflare tokens or player database files in an itch.io upload.\n')
source = a.out / 'ashfall-source.zip'
files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
allowed = {'public', 'server', 'worker', 'tests', 'scripts', 'docs', '.github'}
with zipfile.ZipFile(source, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name in sorted(set(files)):
        f = ROOT / name
        if not name or not f.is_file():
            continue
        if len(Path(name).parts) > 1 and Path(name).parts[0] not in allowed:
            continue
        if len(Path(name).parts) == 1 and name not in {'README.md', 'package.json', 'package-lock.json', 'wrangler.toml', '.gitignore', 'LICENSE', 'LICENSE.md'}:
            continue
        if name.startswith('.env') or f.is_symlink():
            continue
        z.write(f, name)
    z.writestr('UPLOAD-ITCH-TH.txt', (ROOT / 'docs/UPLOAD-ITCH-TH.txt').read_text())
readme = (ROOT / 'docs/UPLOAD-ITCH-TH.txt').read_text()
(a.out / 'UPLOAD-ITCH-TH.txt').write_text(readme)
manifest = {'protocol': {'onlineAuthority': 2}, 'websocket': a.ws, 'productionBackendVerified': False,
            'baseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip(),
            'includesWorkingTreeChanges': True, 'artifacts': {}}
for f in (frontend, worker, source):
    with zipfile.ZipFile(f) as z:
        assert z.testzip() is None
    manifest['artifacts'][f.name] = {'bytes': f.stat().st_size, 'sha256': hashlib.sha256(f.read_bytes()).hexdigest()}
(a.out / 'release-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
