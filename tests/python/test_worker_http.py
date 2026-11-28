"""Exercise FastAPI request binding without launching cloud compute."""
import os
import time
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from cloud.modal_app import submit_http, cancel_http, _signature


class WorkerHttpTests(unittest.TestCase):
    def setUp(self):
        self.secret = patch.dict(os.environ, {"MODAL_WEBHOOK_SECRET": "test-only-not-a-real-secret"})
        self.secret.start()
        app = FastAPI()
        app.post("/submit")(submit_http)
        app.post("/cancel")(cancel_http)
        self.client = TestClient(app)

    def tearDown(self):
        self.secret.stop()

    def test_missing_signature_rejected_before_work(self):
        self.assertEqual(self.client.post("/submit", json={}).status_code, 401)

    def test_invalid_timestamp_is_unauthorized(self):
        response = self.client.post("/submit", json={}, headers={
            "x-finalmix-timestamp": "invalid", "x-finalmix-signature": "invalid"})
        self.assertEqual(response.status_code, 401)

    def test_valid_signed_cancel_binds_request_body(self):
        body = '{}'
        timestamp = str(int(time.time()))
        response = self.client.post("/cancel", content=body, headers={
            "content-type": "application/json", "x-finalmix-timestamp": timestamp,
            "x-finalmix-signature": _signature(body, timestamp)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"accepted": False})


if __name__ == "__main__":
    unittest.main()
