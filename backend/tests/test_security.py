import os
import unittest
import time
from unittest.mock import patch
from fastapi import HTTPException

os.environ.setdefault(
    "AUTH_SECRET_KEY",
    "unit-test-secret-that-is-long-and-never-used-in-production",
)

from models import ChatRequest, LoginRequest, RegisterRequest
from services.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
    _encode,
)
from app import require_authenticated_user, ensure_user_access


class AuthenticationTests(unittest.TestCase):
    def test_passwords_are_hashed_and_verified(self):
        hashed = hash_password("correct horse battery staple")
        self.assertNotIn("correct horse battery staple", hashed)
        self.assertTrue(verify_password("correct horse battery staple", hashed))
        self.assertFalse(verify_password("wrong password", hashed))

    def test_signed_access_token_round_trip(self):
        token = create_access_token(42)
        self.assertEqual(decode_access_token(token), 42)

    def test_expired_token_rejected(self):
        token = create_access_token(42)
        # Fast-forward time past token expiration
        with patch("services.auth.time.time", return_value=time.time() + 999999):
            with self.assertRaises(ValueError) as ctx:
                decode_access_token(token)
            self.assertIn("expired", str(ctx.exception).lower())

    def test_tampered_token_rejected(self):
        token = create_access_token(42)
        payload, sig = token.split(".", 1)
        # Tamper payload
        tampered_token = f"{payload}x.{sig}"
        with self.assertRaises(ValueError):
            decode_access_token(tampered_token)

    def test_malformed_token_rejected(self):
        with self.assertRaises(ValueError):
            decode_access_token("not-a-valid-token")
        with self.assertRaises(ValueError):
            decode_access_token("")

    def test_registration_rejects_short_password(self):
        with self.assertRaises(ValueError):
            RegisterRequest(
                name="Farmer",
                email="farmer@example.com",
                password="short",
            )

    def test_email_is_normalized(self):
        request = LoginRequest(
            email="  Farmer@Example.COM ",
            password="password",
        )
        self.assertEqual(request.email, "farmer@example.com")

    def test_chat_message_removes_control_characters(self):
        request = ChatRequest(
            session_id="1",
            user_id="1",
            message="  rice\u0000 disease  ",
        )
        self.assertEqual(request.message, "rice disease")

    def test_require_authenticated_user_missing_header(self):
        with self.assertRaises(HTTPException) as ctx:
            require_authenticated_user(authorization=None)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_require_authenticated_user_invalid_bearer(self):
        with self.assertRaises(HTTPException) as ctx:
            require_authenticated_user(authorization="InvalidPrefix 123")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_ensure_user_access_controls(self):
        # Accessing own data succeeds
        try:
            ensure_user_access(authenticated_user_id=10, requested_user_id=10)
            ensure_user_access(authenticated_user_id=10, requested_user_id="10")
        except HTTPException:
            self.fail("ensure_user_access raised HTTPException on valid user")

        # Accessing another user's data raises 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            ensure_user_access(authenticated_user_id=10, requested_user_id=99)
        self.assertEqual(ctx.exception.status_code, 403)


    def test_register_and_login_guarantee_session_cleanup(self):
        """Endpoints always close their SQLAlchemy session on error or success."""
        from fastapi.testclient import TestClient
        from unittest.mock import MagicMock
        import app as app_module

        client = TestClient(app_module.app)
        real_sessionlocal = app_module.SessionLocal

        # Test login with invalid credentials guarantees session close
        sessions_created = []
        def spied_sessionlocal():
            sess = real_sessionlocal()
            real_close = sess.close
            sess.close = MagicMock(side_effect=real_close)
            sessions_created.append(sess)
            return sess

        with patch("services.security._local_rate_limited", return_value=False):
            with patch.object(app_module, "SessionLocal", side_effect=spied_sessionlocal):
                res = client.post(
                    "/login",
                    json={"email": "nonexistent_farmer@example.com", "password": "wrongpassword123"},
                )
                self.assertEqual(res.status_code, 401)
                self.assertEqual(len(sessions_created), 1)
                sessions_created[0].close.assert_called_once()

        # Test duplicate register guarantees session close on 400 error
        sessions_created.clear()
        import uuid
        unique_email = f"session_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "name": "Session Farmer",
            "email": unique_email,
            "password": "ValidPassword123!",
            "language": "English",
        }
        try:
            with patch("services.security._local_rate_limited", return_value=False):
                # First registration succeeds
                with patch.object(app_module, "SessionLocal", side_effect=spied_sessionlocal):
                    res1 = client.post("/register", json=reg_payload)
                    self.assertEqual(res1.status_code, 200)
                    self.assertEqual(len(sessions_created), 1)
                    sessions_created[0].close.assert_called_once()

                # Second registration with same email raises 400 and guarantees session close
                sessions_created.clear()
                with patch.object(app_module, "SessionLocal", side_effect=spied_sessionlocal):
                    res2 = client.post("/register", json=reg_payload)
                    self.assertEqual(res2.status_code, 400)
                    self.assertEqual(len(sessions_created), 1)
                    sessions_created[0].close.assert_called_once()
        finally:
            cleanup_db = real_sessionlocal()
            try:
                cleanup_db.query(app_module.User).filter(app_module.User.email == unique_email).delete()
                cleanup_db.commit()
            finally:
                cleanup_db.close()






if __name__ == "__main__":
    unittest.main()
