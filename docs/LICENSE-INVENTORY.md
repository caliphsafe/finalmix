# Dependency and model license inventory

Research date: 2026-11-26. This is an engineering inventory, not commercial clearance. Exact shipped versions are recorded in the project manifests/lockfiles. Preserve all dependency notices; transitive and binary dependencies need a release audit.

| Component | License family / source | Integration policy |
|---|---|---|
| Next.js | MIT — [license](https://github.com/vercel/next.js/blob/canary/license.md) | Frontend/static export. |
| React | MIT — [license](https://github.com/facebook/react/blob/main/LICENSE) | Frontend. |
| TypeScript | Apache-2.0 — [license](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) | Development tooling. |
| NumPy | BSD-3-Clause — [license](https://github.com/numpy/numpy/blob/main/LICENSE.txt) | Numerical audio. |
| SciPy | BSD-3-Clause — [license](https://github.com/scipy/scipy/blob/main/LICENSE.txt) | Filters and resampling. |
| SoundFile | BSD-3-Clause — [project](https://pypi.org/project/soundfile/) | Audio IO; bundled libsndfile has separate LGPL terms. |
| libsndfile | LGPL-2.1-or-later — [license](https://github.com/libsndfile/libsndfile/blob/master/COPYING) | Binary redistribution must preserve its obligations. |
| pyloudnorm | MIT — [license](https://github.com/csteinmetz1/pyloudnorm/blob/master/LICENSE) | Local loudness measurement, when installed. |
| FastAPI | MIT — [license](https://github.com/fastapi/fastapi/blob/master/LICENSE) | Local API only. |
| Uvicorn | BSD-3-Clause — [license](https://github.com/encode/uvicorn/blob/master/LICENSE.md) | Loopback serving. |
| PyTorch | BSD-style with third-party notices — [license](https://github.com/pytorch/pytorch/blob/main/LICENSE) | Optional model runtime; audit binary package notices. |
| torchaudio | BSD-2-Clause — [license](https://github.com/pytorch/audio/blob/main/LICENSE) | Optional model dependency. |
| Demucs code | MIT — [license](https://github.com/facebookresearch/demucs/blob/main/LICENSE) | Excluded from the active cloud image until model rights are cleared. |
| Demucs weights | Unclear per [author's current README](https://github.com/adefossez/demucs#license) | Not commercially cleared by this project; not bundled. |
| FFmpeg | Usually LGPL-2.1-or-later; selected build components can make it GPL or nonredistributable — [official legal page](https://ffmpeg.org/legal.html) | External user-installed executable. Inspect `ffmpeg -buildconf` and `ffmpeg -L` before distribution. |
| Spotify Pedalboard | GPL-3.0 — [official repository](https://github.com/spotify/pedalboard) | Evaluated, excluded from this proprietary-oriented foundation. |
| Matchering | GPL-3.0 — [official repository](https://github.com/sergree/matchering) | Evaluated, excluded; reference matching is independently implemented. |
| BS-RoFormer implementation | MIT — [license](https://github.com/lucidrains/BS-RoFormer/blob/main/LICENSE) | Evaluated, not integrated. Checkpoint terms separate. |
| Open-Unmix | MIT code; `umxl` weights CC BY-NC-SA 4.0 — [repository](https://github.com/sigsep/open-unmix-pytorch) | Evaluated, not integrated. |

No commercial plugin code, assets, presets, or product UI artwork are included. Product names in research are references only. FINAL MIX's own license/ownership decision is independent of these third-party licenses.

## Hosting eligibility

[Vercel Hobby](https://vercel.com/docs/plans/hobby) is restricted to personal/noncommercial use. FINAL MIX is being connected to the user's existing Vercel Pro team. Audio bytes bypass Vercel Functions and move directly between the browser, private R2 and Modal.
