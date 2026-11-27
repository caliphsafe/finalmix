# 43DOU Audio Engine

Milestone 1 decodes with FFmpeg, measures the complete source, applies bounded spectral corrections, linked dynamics where selected, phase-aware mid/side width, gain staging, loudness gain constrained by oversampled peak headroom, PCM WAV rendering and post-export remeasurement.

The worker stores mix, master and JSON engineering report objects. A job completes only after duration, clipping and true-peak checks pass.

Integrated loudness and true peak use FFmpeg's BS.1770-family implementation. RMS, crest factor, phase correlation, side/mid ratio, band energy, centroid, silence and window dynamics come from decoded samples. Band energy is not labeled as vocal prominence, masking, sibilance or distortion.

Milestone 1 has no source separation, restoration, BPM/key detection, section automation, dynamic EQ, multiband compression, saturation model, reverb or delay. Related controls remain disabled.
