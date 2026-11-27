"""Explicit opt-in model installer. Run with the local engine virtualenv Python."""
import subprocess, sys
from pathlib import Path
print('HTDemucs is optional and experimental. It downloads several large dependencies and model weights.')
print('Demucs code is MIT; model weight rights are NOT commercially cleared by FINAL MIX.')
print('Review https://github.com/adefossez/demucs and its current license before proceeding.')
print('Recordings stay local. First separation downloads pretrained weights to the local cache.')
print('Python 3.11 recommended; CPU processing can take many minutes per song.')
if input('Type INSTALL to accept these limitations and install: ').strip() != 'INSTALL':
    raise SystemExit('Cancelled; nothing installed.')
subprocess.run([sys.executable,'-m','pip','install','-r',str(Path(__file__).resolve().parents[1]/'engine'/'requirements-model.txt')],check=True)
print('Installation completed. Restart the local engine, then explicitly enable experimental separation.')
