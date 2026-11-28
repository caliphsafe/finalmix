# Engineering research and design decisions

Research date: 2026-11-26. These are functional references and published principles, not copied proprietary algorithms, product benchmarks, or endorsements. FINAL MIX is an initial engineering foundation, not an equivalent replacement for the products below.

## Measurement before intervention

[ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770/en) defines loudness and true-peak measurement; it does not prescribe one ideal music master. Use K-weighted gated integrated loudness to inform gain decisions, not RMS relabeled as LUFS. Sample peak does not reveal every intersample peak. An oversampled estimator is still an estimator until tested against a conformance corpus. Silence must produce an unavailable loudness value, never an invented number.

[EBU Tech 3342](https://tech.ebu.ch/docs/tech/tech3342.pdf) defines loudness range using gated short-term loudness statistics. LRA and crest factor describe different properties. Short clips do not support meaningful long-term dynamic conclusions. Frequency-energy ratios are useful indicators but cannot, by themselves, diagnose sibilance, vocal masking, or distortion.

[W3C Audio EQ Cookbook](https://www.w3.org/TR/audio-eq-cookbook/) documents biquad formulas. Use bounded broad filters before speculative surgical corrections. Preserve bypass, original audio, and parameter history. A loudness-matched comparison is necessary because increased level can bias perceived improvement. Spectral similarity is not proof of artistic similarity.

## Product workflow review

| Reference | Observed function from primary documentation | FINAL MIX engineering implication |
|---|---|---|
| [iZotope Ozone](https://www.izotope.com/en/learn/hidden-mastering-features-in-ozone) | Assistant proposes mastering processing and supports references. | Analysis generates an inspectable starting point; the user can change it. |
| [iZotope Neutron](https://www.izotope.com/en/learn/get-started-mixing-with-neutron-elements) | Track-oriented assistant and reference targets. | Keep mixing and mastering separate; use source-specific controls only when a source exists. |
| [iZotope RX](https://support.izotope.com/hc/en-us/articles/47669810062093-Where-to-find-and-use-individual-RX-modules) | Distinct de-clip, denoise, and spectral repair modules. | Restoration is a separate problem; avoid presenting tonal EQ as reconstruction or denoising. |
| [LANDR](https://support.landr.com/hc/en-us/articles/360049844534-What-is-reference-mastering) | User supplies a reference track during mastering. | Analyze an authorized uploaded reference; never mix its audio into the song. |
| [eMastered](https://help.emastered.com/hc/en-us/articles/5572829549581-How-Do-I-Access-Use-Reference-Mastering) | Separate song/reference inputs followed by mastering. | Keep reference availability and processing eligibility explicit. |
| [BandLab Mastering](https://help.bandlab.com/hc/en-us/articles/360001374513-Using-BandLab-Mastering-on-your-songs) | Simple sonic style selection and immediate audition. | Offer understandable intent controls without implying a style is correct for every recording. |
| [Moises](https://moises.ai/tools/stem-splitter/) | Four-way separation into vocals, drums, bass, and other. | Start with four estimated stems, acknowledge leakage and artifacts. |
| [sonible smart:EQ](https://www.sonible.com/products/smarteq4/) | Spectral balance and cross-track priority controls. | Cross-source masking requires source information; stereo band ratios cannot identify competing instruments. |
| [sonible smart:comp](https://www.sonible.com/products/smartcomp3/) | Adaptive compression with spectral processing. | Tie dynamics decisions to measured activity; do not compress by default merely because a preset contains a compressor. |
| [FabFilter Pro-Q](https://www.fabfilter.com/help/pro-q/using/analyzer) | Real-time spectral analysis with adjustable temporal response. | Render measured spectral data and distinguish instantaneous displays from full-song summaries. |
| [FabFilter Pro-L](https://www.fabfilter.com/help/pro-l/using/truepeaklimiting) | Explicit true-peak limiting separate from sample-peak limiting. | Verify post-render peaks and reserve margin; meter before and after sample-rate conversion. |
| [Waves](https://www.waves.com/plugins/mastering) | Separate dynamic EQ, limiting, stereo imaging, and loudness tools. | Keep processors modular; report their actual function, not a generic “AI enhancement.” |
| [Universal Audio](https://help.uaudio.com/hc/en-us/articles/33537058867860-Precision-Multiband-Manual) | Frequency-band-specific dynamics with distinct compression, expansion, and gating. | Multiband behavior must be implemented and tested explicitly before advertised. |
| [Logic Pro](https://support.apple.com/en-my/108294) | Mastering Assistant with loudness compensation for comparison. | A/B should preserve position and compensate monitoring gain without altering exported audio. |
| [Avid Pro Tools](https://apps.avid.com/ProToolsHelp/versioncurrent/enu/Content/Pro%20Tools%20Reference%20Guide/Part9_Mixing/Mixdown.htm) | Mix rendering and export are explicit operations. | Export should produce a real rendered file with inspectable format, rate, channels, and duration. |

## Initial engineering policy

1. Decode and validate complete input before processing. Never recover an MP3's lost information by changing its container to WAV.
2. Treat genre/style profiles as bounded priorities, not a substitute for measurement.
3. Make conservative broad tonal changes and dynamics changes only when supported by input measurements or explicit user direction.
4. Maintain a separate mix before master. Render from the original for revisions rather than repeatedly processing a previous lossy export.
5. Limit excessive gain demands rather than crushing all tracks to one LUFS target.
6. Check finite samples, duration, channel count, sample peak, estimated true peak, and stereo compatibility after processing and export.
7. Surface unsupported requests. “Bring background vocals forward” cannot be executed honestly without a suitable separated or original source.
8. A technically valid master still requires listening. Metrics are guardrails, not a score proving professional sound.

## Psychoacoustic cautions

Louder, brighter, and wider can seem better in quick comparisons while becoming fatiguing or losing mono compatibility. Added harmonics can increase perceived presence but also introduce aliasing. Fast gain changes can distort low frequencies; short release times can pump. Overaggressive source separation and spectral matching can alter timbre. Accordingly, default decisions should preserve identity and dynamics, with changes auditionable and reversible.

YouTube URLs identify creative references only. Embedded playback is separate from acoustic analysis; no audio extraction is included. The original/reference files remain separate throughout processing.
