"""Run: python -m unittest discover -s tests/python -v"""
import tempfile, unittest, threading, time, json
from pathlib import Path
import numpy as np
from engine import dsp

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.root=Path(self.temp.name); self.sr=44100
        t=np.arange(self.sr*4)/self.sr
        # Original synthetic musical fixture: bass, chord, transients. No third-party audio.
        bass=.14*np.sin(2*np.pi*55*t)
        chord=sum(.025*np.sin(2*np.pi*f*t) for f in (220,277.18,329.63))
        kick=.28*np.sin(2*np.pi*(80*t))*np.exp(-18*(t%.5))
        self.x=np.stack([bass+chord+kick,bass+.9*chord+kick],axis=1)
        self.path=self.root/'source.wav'; dsp.write_float(self.path,self.x,self.sr)
    def tearDown(self): self.temp.cleanup()
    def test_analysis_measured(self):
        a=dsp.analyze(self.x,self.sr,self.path)
        self.assertAlmostEqual(a['duration'],4); self.assertEqual(a['clipped_samples'],0)
        self.assertTrue(-40<a['integrated_lufs']<0); self.assertGreater(a['phase_correlation'],.98)
        self.assertLess(abs(sum(a['bands'].values())-1),.02)
    def test_silence_finite(self):
        zero=np.zeros_like(self.x); dsp.write_float(self.path,zero,self.sr)
        a=dsp.analyze(zero,self.sr,self.path); self.assertIsNone(a['integrated_lufs'])
        y,_=dsp.master(zero,self.sr,-14,-1,a); self.assertTrue(np.isfinite(y).all()); self.assertEqual(np.max(abs(y)),0)
    def test_equalizer_gain(self):
        t=np.arange(self.sr)/self.sr; x=(.1*np.sin(2*np.pi*350*t))[:,None]
        y=dsp.equalize(x,self.sr,350,3)
        ratio=np.sqrt(np.mean(y[4000:]**2)/np.mean(x[4000:]**2)); self.assertAlmostEqual(dsp.db(ratio),3,places=2)
    def test_export_all_formats_and_rates(self):
        before=dsp.analyze(self.x,self.sr,self.path)
        mix,_=dsp.mix(self.x,self.sr,{'low_db':2,'compression':.3},before)
        mixed=self.root/'mix.wav'; dsp.write_float(mixed,mix,self.sr)
        ma=dsp.analyze(mix,self.sr,mixed)
        master,_=dsp.master(mix,self.sr,-14,-1.3,ma)
        self.assertGreater(np.max(abs(master-self.x)),.01)
        for depth,rate in [(16,44100),(24,48000),(32,96000)]:
            out=self.root/f'master-{depth}.wav'; metadata=dsp.export_audio(master,self.sr,out,{'bit_depth':depth,'sample_rate':rate})
            self.assertEqual(metadata['bits'],depth); self.assertEqual(metadata['sample_rate'],rate); self.assertEqual(metadata['channels'],2)
            data,sr=dsp.decode(out); self.assertAlmostEqual(len(data)/sr,4,places=3); self.assertLessEqual(dsp.loudness(out)['true_peak_db'],-1)
        mp3=self.root/'master.mp3'; dsp.export_audio(master,self.sr,mp3,{'format':'mp3','bit_depth':24}); data,sr=dsp.decode(mp3)
        self.assertTrue(len(data)>0)
    def test_mono_export(self):
        out=self.root/'mono.wav'; meta=dsp.export_audio(self.x[:,:1],self.sr,out,{'bit_depth':24}); self.assertEqual(meta['channels'],1)
    def test_inverted_stereo_declines_widening(self):
        x=np.stack([self.x[:,0],-self.x[:,0]],axis=1); a=dsp.analyze(x,self.sr)
        _,notes=dsp.mix(x,self.sr,{'width':1.5},a); self.assertTrue(any('Declined' in note for note in notes))
    def test_api_security_and_pipeline(self):
        from fastapi.testclient import TestClient
        from engine.app import app
        with TestClient(app,base_url="http://127.0.0.1:8765") as client:
            self.assertEqual(client.get('/api/session',headers={'Origin':'https://evil.example'}).status_code,403)
            self.assertEqual(client.get('/api/session',headers={'Host':'evil.example'}).status_code,403)
            self.assertEqual(client.get('/api/jobs/unknown').status_code,401)
            token=client.get('/api/session').json()['token']; headers={'X-Final-Mix-Token':token}
            mp3=self.root/'rough.mp3'; dsp.export_audio(self.x,self.sr,mp3,{'format':'mp3'})
            result=client.post('/api/jobs',headers=headers,files={'audio':('song.mp3',mp3.read_bytes(),'audio/mpeg')},data={'settings':json.dumps({'low_db':1,'bit_depth':24})})
            self.assertEqual(result.status_code,200,result.text); id=result.json()['id']
            for _ in range(200):
                j=client.get('/api/jobs/'+id,headers=headers).json()
                if j['status'] in ('complete','error'): break
                time.sleep(.1)
            self.assertEqual(j['status'],'complete',j)
            self.assertTrue(j['report']['quality']['true_peak_pass'])
            audio=client.get('/api/jobs/'+id+'/audio',headers=headers); self.assertEqual(audio.status_code,200); self.assertEqual(audio.content[:4],b'RIFF')
            self.assertEqual(client.delete('/api/jobs/'+id,headers=headers).status_code,200)
            self.assertEqual(client.get('/api/jobs/'+id,headers=headers).status_code,404)
    def test_playlist_rejected(self):
        malicious=self.root/'input.audio'; malicious.write_text('ffconcat version 1.0\nfile /etc/passwd\n')
        with self.assertRaises(RuntimeError): dsp.decode(malicious)
    def test_cancellation(self):
        import sys
        cancel=threading.Event(); cancel.set()
        with self.assertRaisesRegex(RuntimeError,'cancelled'): dsp.run([sys.executable,'-c','import time;time.sleep(30)'],cancel)
    def test_bad_settings_rejected(self):
        from engine.app import Settings
        for d in ({'width':8},{'target_lufs':-2},{'ceiling_db':float('nan')},{'not_real':1}):
            with self.assertRaises(Exception): Settings(**d)

if __name__=='__main__': unittest.main()
