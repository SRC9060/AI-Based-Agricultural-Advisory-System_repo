import os
import unittest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from app import app


class CorsSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.prod_origin = "https://ai-based-agricultural-advisory-syst-liard.vercel.app"
        self.evil_origin = "https://evil-example.com"

    def test_allowed_production_origin_get_request(self):
        """
        Verify that requests with the exact production Vercel origin receive
        Access-Control-Allow-Origin matching the origin and Access-Control-Allow-Credentials: true.
        """
        response = self.client.get(
            "/health",
            headers={"Origin": self.prod_origin},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            self.prod_origin,
        )
        self.assertEqual(
            response.headers.get("access-control-allow-credentials"),
            "true",
        )

    def test_disallowed_malicious_origin_rejected(self):
        """
        Verify that requests from an untrusted / malicious origin do NOT receive
        permissive Access-Control-Allow-Origin headers or credential grants.
        """
        response = self.client.get(
            "/health",
            headers={"Origin": self.evil_origin},
        )
        self.assertEqual(response.status_code, 200)
        # CORS middleware should not reflect unauthorized origin
        self.assertIsNone(response.headers.get("access-control-allow-origin"))
        self.assertNotEqual(
            response.headers.get("access-control-allow-origin"),
            self.evil_origin,
        )
        self.assertNotEqual(
            response.headers.get("access-control-allow-origin"),
            "*",
        )

    def test_options_preflight_allowed_production_origin(self):
        """
        Verify that a realistic CORS preflight request from the production origin
        succeeds with expected CORS headers.
        """
        response = self.client.options(
            "/login",
            headers={
                "Origin": self.prod_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            self.prod_origin,
        )
        self.assertEqual(
            response.headers.get("access-control-allow-credentials"),
            "true",
        )
        allow_methods = response.headers.get("access-control-allow-methods", "")
        self.assertIn("POST", allow_methods.upper())
        allow_headers = response.headers.get("access-control-allow-headers", "")
        self.assertTrue(
            "authorization" in allow_headers.lower()
            or "*" in allow_headers
            or "content-type" in allow_headers.lower()
        )

    def test_options_preflight_malicious_origin_rejected(self):
        """
        Verify that a CORS preflight from an unauthorized origin is rejected
        without granting origin access or credentials.
        """
        response = self.client.options(
            "/login",
            headers={
                "Origin": self.evil_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        self.assertNotEqual(
            response.headers.get("access-control-allow-origin"),
            self.evil_origin,
        )
        self.assertNotEqual(
            response.headers.get("access-control-allow-origin"),
            "*",
        )
        self.assertIsNone(response.headers.get("access-control-allow-origin"))

    def test_cors_config_no_wildcard_with_credentials(self):
        """
        Verify Config.ALLOWED_ORIGINS never contains '*' and always sanitizes trailing slashes.
        """
        self.assertNotIn("*", Config.ALLOWED_ORIGINS)
        for origin in Config.ALLOWED_ORIGINS:
            self.assertFalse(origin.endswith("/"), f"Origin has trailing slash: {origin}")
            self.assertTrue(
                origin.startswith("http://") or origin.startswith("https://"),
                f"Invalid origin protocol: {origin}",
            )
        self.assertIn(self.prod_origin, Config.ALLOWED_ORIGINS)

    def test_production_cors_middleware_isolation(self):
        """
        Verify that an app configured with production settings strictly enforces allowed origins
        without allowing dev regex patterns (localhost / private IPs).
        """
        prod_app = FastAPI()
        prod_app.add_middleware(
            CORSMiddleware,
            allow_origins=[self.prod_origin],
            allow_origin_regex=None,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @prod_app.get("/test")
        def sample():
            return {"status": "ok"}

        client = TestClient(prod_app)

        # Production origin succeeds
        prod_res = client.get("/test", headers={"Origin": self.prod_origin})
        self.assertEqual(
            prod_res.headers.get("access-control-allow-origin"),
            self.prod_origin,
        )
        self.assertEqual(
            prod_res.headers.get("access-control-allow-credentials"),
            "true",
        )

        # Localhost is rejected under production isolation
        local_res = client.get("/test", headers={"Origin": "http://localhost:3000"})
        self.assertIsNone(local_res.headers.get("access-control-allow-origin"))

        # Random origin is rejected
        evil_res = client.get("/test", headers={"Origin": self.evil_origin})
        self.assertIsNone(evil_res.headers.get("access-control-allow-origin"))


if __name__ == "__main__":
    unittest.main()
