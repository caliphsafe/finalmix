# Source separation evaluation

Research date: 2026-11-26. This is a practical selection review, not a measured model shootout. No separation-quality ranking is claimed from testing performed for FINAL MIX.

| Candidate | Practical fit | Licensing / maintenance finding | Release decision |
|---|---|---|---|
| Demucs / Hybrid Demucs | Waveform and hybrid approaches; established four-stem workflow. | [Original repository](https://github.com/facebookresearch/demucs) is archived. Code is MIT. | Retain a replaceable adapter, not a proprietary dependency assumption. |
| Hybrid Transformer Demucs (`htdemucs`) | Four sources align with the required vocals/drums/bass/other workflow; CPU inference possible, costly on long tracks. Fine-tuned variant trades time for potential quality. | [Author-maintained fork](https://github.com/adefossez/demucs) states maintenance is slow and explicitly says weight licensing is unclear. MIT code licensing does not establish commercial clearance for weights. | Optional local experimental adapter. Do not describe weights as commercially cleared. |
| BS-RoFormer | Attention across frequency bands and time; flexible model architecture. | [Implementation](https://github.com/lucidrains/BS-RoFormer) is MIT. Individual checkpoints have independent provenance and licensing. | Future adapter after checkpoint-specific license and performance verification. |
| Mel-Band RoFormer | Useful specialized vocal separation candidate, not automatically a four-stem replacement. | Same implementation supports it. [KimberleyJSN model card](https://huggingface.co/KimberleyJSN/melbandroformer) declares MIT but has an empty descriptive README; preserve checkpoint identity and independently verify intended scope before redistribution. | Future evaluated option; no bundled checkpoint. |
| Open-Unmix | Transparent spectrogram/LSTM baseline, vocals/drums/bass/other. | [Official repository](https://github.com/sigsep/open-unmix-pytorch) code MIT; default `umxl` weights explicitly CC BY-NC-SA 4.0. Other variants require individual verification. | Do not silently substitute the default model in a proprietary commercial release. |

## Safety and fidelity

Estimated stems are not recovered original session tracks. A low reconstruction error when summing stems is not proof that individual stems are free of bleed, watery artifacts, or missing transients. Numerical checks can catch gross failures; audible artifact assessment still needs listening.

Use the original stereo mix as the fallback. A hybrid render can retain the original and add bounded differences from processed estimated stems. Do not claim automatic audible-artifact detection from a reconstruction metric alone. Original, aligned stems are preferred when available.

## Hardware and installation

Model packages and checkpoints are large and may require internet access to install. Audio inference is local; downloading a model does not require uploading the song. CPU inference can be slow. GPU compatibility and memory depend on model, runtime, segment length, operating system, and driver. Publish timings only from a recorded test run, never vendor timings as FINAL MIX measurements.

The browser release does not ship a source-separation model. A future browser/WebGPU adapter must pass numerical, browser-compatibility, memory, licensing, and listening tests before enabling it.

## Commercial gate

A commercial release needs a documented checkpoint source, exact hash/version, applicable weight terms, code notices, runtime notices, redistribution scope, and validation corpus rights. Current Demucs weight uncertainty is an unresolved commercial blocker, not permission to invent a license. No model is trained on uploaded music by this release.
