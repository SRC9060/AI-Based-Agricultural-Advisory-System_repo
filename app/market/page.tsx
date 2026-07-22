"use client";

import Link from "next/link";

export default function MarketPage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>💰 Market Prices</h1>
      <p>Market prices module coming soon.</p>

      <br />

      <Link href="/chat">
        ← Back to AI Assistant
      </Link>
    </div>
  );
}