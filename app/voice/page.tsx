"use client";

import Link from "next/link";

export default function VoicePage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>🎤 Voice Advisory</h1>
      <p>Voice advisory module coming soon.</p>

      <br />

      <Link href="/chat">
        ← Back to AI Assistant
      </Link>
    </div>
  );
}