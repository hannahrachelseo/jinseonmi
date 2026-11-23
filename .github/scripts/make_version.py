# 앱 폴더의 파일 목록과 버전을 version.json 으로 만들어요 (안드로이드 앱 자동 업데이트용)
import json, os, sys
root, version = sys.argv[1], sys.argv[2]
files = []
for d, _, names in os.walk(root):
    for n in names:
        p = os.path.relpath(os.path.join(d, n), root).replace(os.sep, '/')
        if p not in ('offline.html', 'version.json'):
            files.append(p)
files = sorted(files) + ['version.json']
with open(os.path.join(root, 'version.json'), 'w') as f:
    json.dump({'version': version, 'files': files}, f, ensure_ascii=False)
print(version, len(files), 'files')
