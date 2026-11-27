import unittest
import numpy as np
from audio_engine import dsp


class CloudDSPTests(unittest.TestCase):
    def test_analysis_uses_real_samples(self):
        rate = 48000
        t = np.arange(rate * 2) / rate
        tone = 0.1 * np.sin(2 * np.pi * 1000 * t)
        audio = np.stack([tone, tone], axis=1)
        report = dsp.analyze(audio, rate)
        self.assertAlmostEqual(report["duration"], 2.0, places=5)
        self.assertAlmostEqual(report["rms_db"], -23.01, delta=0.1)
        self.assertGreater(report["phase_correlation"], 0.999)

    def test_phase_guard_declines_widening(self):
        rate = 48000
        t = np.arange(rate) / rate
        tone = 0.2 * np.sin(2 * np.pi * 500 * t)
        audio = np.stack([tone, -tone], axis=1)
        report = dsp.analyze(audio, rate)
        _, decisions = dsp.mix(audio, rate, {"width": 1.4, "auto_correct": False}, report)
        self.assertTrue(any("Declined widening" in decision for decision in decisions))

    def test_master_preserves_length_and_peak_headroom(self):
        rate = 44100
        rng = np.random.default_rng(43)
        audio = rng.normal(0, 0.05, (rate, 2))
        mastered, _ = dsp.master(audio, rate, -14, -1, {"integrated_lufs": -22})
        self.assertEqual(mastered.shape, audio.shape)
        self.assertLessEqual(np.max(np.abs(mastered)), 1.0)


if __name__ == "__main__":
    unittest.main()
