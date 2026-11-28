import io
import unittest
from unittest.mock import Mock
from cloud.modal_app import _storage_probe


class Denied(Exception):
    response = {"Error": {"Code": "AccessDenied", "Message": "sensitive details"},
                "ResponseMetadata": {"HTTPStatusCode": 403}}


class StorageProbeTests(unittest.TestCase):
    def test_write_failure_preserved_without_cleanup_attempt(self):
        client = Mock()
        client.put_object.side_effect = Denied()
        result = _storage_probe(client, "test-bucket", "diagnostics/unique/test")
        self.assertEqual(result["putObject"]["code"], "AccessDenied")
        client.delete_object.assert_not_called()
        self.assertNotIn("sensitive details", str(result))

    def test_readback_failure_still_cleans_up_created_object(self):
        client = Mock()
        client.get_object.return_value = {"Body": io.BytesIO(b"wrong data")}
        result = _storage_probe(client, "test-bucket", "diagnostics/unique/test")
        self.assertFalse(result["readback"]["ok"])
        client.delete_object.assert_called_once_with(Bucket="test-bucket", Key="diagnostics/unique/test")


if __name__ == "__main__":
    unittest.main()
