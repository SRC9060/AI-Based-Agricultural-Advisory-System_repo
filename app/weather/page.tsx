"use client";

import Link from "next/link";

export default function WeatherPage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>🌦 Weather Forecast</h1>
      <p>Weather prediction module will be available here.</p>

      <br />

      <Link href="/chat">
        ← Back to AI Assistant
      </Link>
    </div>
  );
}