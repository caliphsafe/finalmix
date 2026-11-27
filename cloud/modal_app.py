"""FINAL MIX V3 Modal entrypoint.

All audio bytes move between Modal and private R2. Vercel submits only object keys and settings.
The first operational milestone implements measured stereo mixing/mastering. Unsupported separation
strategies fail explicitly; no stem output is simulated.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import tempfile
import time
from pathlib import Path

import modal

app = modal.App("final-mix-v3")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "boto3==1.40.75",
        "fastapi==0.121.3",
        "numpy==2.3.5",
        "scipy==1.16.3",
        "requests==2.32.5",
    )
    .add_local_python_source("audio_engine")
)

r2_secret = modal.Secret.from_name("finalmix-r2")
worker_secret = modal.Secret.from_name("finalmix-worker")


def _r2():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        region_name="auto",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    )


def _signature(body: str, timestamp: str) -> str:
    message = f"{timestamp}.{body}".encode()
    return hmac.new(os.environ["MODAL_WEBHOOK_SECRET"].encode(), message, hashlib.sha256).hexdigest()


def _progress(job_id: str, state: str, stage: str, progress: int, **extra):
    import requests
    payload = {"jobId": job_id, "state": state, "stage": stage, "progress": progress, **extra}
    body = json.dumps(payload, separators=(",", ":"))
    timestamp = str(int(time.time()))
    response = requests.post(
        os.environ["VERCEL_PROGRESS_URL"],
        data=body,
        headers={
            "content-type": "application/json",
            "x-finalmix-timestamp": timestamp,
            "x-finalmix-signature": _signature(body, timestamp),
        },
        timeout=15,
    )
    response.raise_for_status()


@app.function(
    image=image,
    secrets=[r2_secret, worker_secret],
    cpu=4,
    memory=8192,
    timeout=1800,
    scaledown_window=60,
    max_containers=1,
)
def process_job(payload: dict):
    from audio_engine import dsp

    job_id = payload["jobId"]
    settings = payload["settings"]
    if settings.get("strategy", "stereo") != "stereo":
        _progress(job_id, "failed", "Requested separation engine is not deployed", 0,
                  error={"code": "SEPARATION_UNAVAILABLE", "message": "Cloud source separation is not operational yet. Choose Stereo processing."})
        return

    s3 = _r2()
    bucket = os.environ["R2_BUCKET"]
    started = time.monotonic()
    try:
        with tempfile.TemporaryDirectory(prefix="finalmix-") as directory:
            root = Path(directory)
            source = root / "source.audio"
            s3.download_file(bucket, payload["sourceObjectKey"], str(source))
            _progress(job_id, "analyzing", "Decoding and measuring the complete recording", 8)
            samples, sample_rate = dsp.decode(source)
            decoded = root / "decoded.wav"
            dsp.write_float(decoded, samples, sample_rate)
            before = dsp.analyze(samples, sample_rate, decoded)

            engine_settings = {
                "auto_correct": True,
                "low_db": 0,
                "mid_db": 0,
                "high_db": 0,
                "width": 1,
                "compression": 0.25 if settings.get("style") in {"punchy", "loud", "aggressive", "radio", "club"} else 0.12,
            }
            style = settings.get("style", "balanced")
            if style in {"warm", "analog"}: engine_settings.update(low_db=0.8, high_db=-0.5)
            if style == "wide": engine_settings["width"] = 1.12
            if style == "clean": engine_settings.update(mid_db=-0.4, high_db=0.25)

            _progress(job_id, "mixing", "Applying measured corrective mixing decisions", 38)
            mixed, mix_decisions = dsp.mix(samples, sample_rate, engine_settings, before)
            mix_path = root / "mix.wav"
            dsp.write_float(mix_path, mixed, sample_rate)
            mix_analysis = dsp.analyze(mixed, sample_rate, mix_path)

            target = settings.get("targetLufs")
            if target is None:
                target = -11.5 if style in {"loud", "aggressive", "club"} else -14.0
            ceiling = float(settings.get("truePeakCeiling", -1.0))
            _progress(job_id, "mastering", "Optimizing level while preserving measured peak headroom", 64)
            master, master_decisions = dsp.master(mixed, sample_rate, float(target), ceiling - 0.15, mix_analysis)
            bit_depth = int(settings.get("outputBitDepth", "24"))
            selected_rate = settings.get("outputSampleRate", "source")
            export_settings = {
                "sample_rate": 0 if selected_rate == "source" else int(selected_rate),
                "bit_depth": bit_depth,
                "format": "wav",
            }
            master_path = root / "master.wav"
            dsp.export_audio(master, sample_rate, master_path, export_settings)

            _progress(job_id, "evaluating", "Remeasuring the rendered master", 82)
            checked, checked_rate = dsp.decode(master_path)
            after = dsp.analyze(checked, checked_rate, master_path)
            duration_ok = abs(after["duration"] - before["duration"]) <= max(0.05, 2 / checked_rate)
            peak_ok = after.get("true_peak_db") is None or after["true_peak_db"] <= ceiling + 0.05
            if not duration_ok or not peak_ok or after["clipped_samples"]:
                raise RuntimeError("Rendered master failed duration, clipping or true-peak verification")

            _progress(job_id, "rendering", "Storing verified private outputs", 92)
            prefix = f"users/owner/jobs/{job_id}"
            mix_key, master_key, report_key = f"{prefix}/mix.wav", f"{prefix}/master.wav", f"{prefix}/report.json"
            report = {
                "version": "v3-stereo-milestone-1",
                "before": before,
                "mix": mix_analysis,
                "after": after,
                "decisions": mix_decisions + master_decisions,
                "quality": {"durationConsistent": duration_ok, "truePeakPass": peak_ok, "noClipping": not after["clipped_samples"]},
                "limitations": ["No source separation was used.", "Technical checks do not establish subjective professional quality."],
                "timing": {"totalSeconds": round(time.monotonic() - started, 3)},
            }
            s3.upload_file(str(mix_path), bucket, mix_key, ExtraArgs={"ContentType": "audio/wav"})
            s3.upload_file(str(master_path), bucket, master_key, ExtraArgs={"ContentType": "audio/wav"})
            s3.put_object(Bucket=bucket, Key=report_key, Body=json.dumps(report), ContentType="application/json", CacheControl="no-store")
            _progress(job_id, "completed", "Master completed and verified", 100,
                      outputAssets={"mix": mix_key, "master": master_key, "report": report_key},
                      metrics={"totalSeconds": report["timing"]["totalSeconds"], "integratedLufs": after.get("integrated_lufs"), "truePeakDb": after.get("true_peak_db")})
    except Exception as exc:
        _progress(job_id, "failed", "Cloud processing failed", 0,
                  error={"code": "PROCESSING_FAILED", "message": str(exc)[:500]})
        raise


def _verify_request(request_body: bytes, timestamp: str | None, supplied: str | None):
    if not timestamp or not supplied or abs(time.time() - int(timestamp)) > 300:
        return False
    return hmac.compare_digest(_signature(request_body.decode(), timestamp), supplied)


@app.function(image=image, secrets=[worker_secret], timeout=60, max_containers=2)
@modal.fastapi_endpoint(method="POST")
async def submit(request):
    from fastapi import HTTPException
    body = await request.body()
    if not _verify_request(body, request.headers.get("x-finalmix-timestamp"), request.headers.get("x-finalmix-signature")):
        raise HTTPException(401, "Invalid job signature")
    payload = json.loads(body)
    call = process_job.spawn(payload)
    return {"accepted": True, "callId": call.object_id}


@app.function(image=image, secrets=[worker_secret], timeout=60, max_containers=2)
@modal.fastapi_endpoint(method="POST")
async def cancel(request):
    from fastapi import HTTPException
    body = await request.body()
    if not _verify_request(body, request.headers.get("x-finalmix-timestamp"), request.headers.get("x-finalmix-signature")):
        raise HTTPException(401, "Invalid cancellation signature")
    payload = json.loads(body)
    call_id = payload.get("workerCallId")
    if call_id:
        modal.FunctionCall.from_id(call_id).cancel()
    return {"accepted": bool(call_id)}
