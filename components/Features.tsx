export default function Features() {
  return (
    <section
      style={{
        padding: "80px 40px",
        backgroundColor: "#f8fff5",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: "2.5rem",
          color: "#2d6a4f",
          marginBottom: "50px",
        }}
      >
        🌱 Our Features
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "30px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div className="feature-card">
          <h3>🌱 Crop Disease Detection</h3>
          <p>Identify crop diseases using AI image analysis.</p>
        </div>

        <div className="feature-card">
          <h3>🌦 Weather Advisory</h3>
          <p>Get real-time weather forecasts for better farming decisions.</p>
        </div>

        <div className="feature-card">
          <h3>🎤 Voice Assistant</h3>
          <p>Ask farming questions using your voice in your local language.</p>
        </div>

        <div className="feature-card">
          <h3>🌍 Multilingual Support</h3>
          <p>Supports English, Telugu, Hindi and more regional languages.</p>
        </div>
      </div>
    </section>
  );
}