export default function Features() {
  return (
    <section
    id="features"
      style={{
        padding: "90px 40px",
        background: "#fffdf6",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: "3rem",
          color: "#8d6e00",
          marginBottom: "15px",
        }}
      >
        🌾 Smart Features
      </h2>

      <p
        style={{
          color: "#666",
          fontSize: "1.15rem",
          marginBottom: "60px",
        }}
      >
        Everything a modern farmer needs in one AI-powered platform.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: "35px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div className="feature-card">
          <div className="feature-icon">🌾</div>

          <h3>Crop Disease Detection</h3>

          <p>
            Upload crop images and instantly detect diseases with AI,
            along with treatment recommendations.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🌦️</div>

          <h3>Weather Advisory</h3>

          <p>
            Get live weather forecasts, rainfall alerts and farming
            recommendations based on your location.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎤</div>

          <h3>Voice Assistant</h3>

          <p>
            Ask farming questions naturally in your preferred language
            using voice interaction.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🌍</div>

          <h3>Multilingual Support</h3>

          <p>
            Supports English, Telugu, Tamil, Hindi, Kannada and several
            other Indian regional languages.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">💹</div>

          <h3>Market Price Updates</h3>

          <p>
            Access real-time crop market prices from AGMARKNET to make
            informed selling decisions.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🏛️</div>

          <h3>Government Schemes</h3>

          <p>
            Explore the latest agricultural schemes, subsidies and
            farmer welfare programs available from the government.
          </p>
        </div>
      </div>
    </section>
  );
}