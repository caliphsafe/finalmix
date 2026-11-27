import shutil
import uvicorn
if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
    raise SystemExit('FFmpeg and ffprobe must be installed and on PATH. See engine/README.md.')
print('FINAL MIX local studio: http://127.0.0.1:8765 — audio stays on this computer.')
uvicorn.run('engine.app:app',host='127.0.0.1',port=8765,access_log=False)
