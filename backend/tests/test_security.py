import os
import unittest

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
)


class AuthenticationTests(unittest.TestCase):
    def test_passwords_are_hashed_and_verified(self):
        hashed = hash_password("correct horse battery staple")
        self.assertNotIn("correct horse battery staple", hashed)
        self.assertTrue(verify_password("correct horse battery staple", hashed))
        self.assertFalse(verify_password("wrong password", hashed))

    def test_signed_access_token_round_trip(self):
        token = create_access_token(42)
        self.assertEqual(decode_access_token(token), 42)

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


if __name__ == "__main__":
    unittest.main()
