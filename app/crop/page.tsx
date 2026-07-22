"use client";

import Link from "next/link";

export default function CropPage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>🌾 Crop Advisory</h1>
      <p>Crop recommendation module coming soon.</p>

      <br />

      <Link href="/chat">
        ← Back to AI Assistant
      </Link>
    </div>
  );
}