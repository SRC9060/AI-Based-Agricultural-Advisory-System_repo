import Link from "next/link";

export default function Navbar() {
  return (
    <nav
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 50px",
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      <h2 style={{ color: "#2d6a4f" }}>
        🌾 AI Agricultural Advisory System
      </h2>

      <div
        style={{
          display: "flex",
          gap: "30px",
          fontWeight: "bold",
        }}
      >
        <Link className="nav-link" href="#home">
          Home
        </Link>

        <Link className="nav-link" href="#features">
          Features
        </Link>

        <Link className="nav-link" href="#how-it-works">
          About
        </Link>

        <Link className="nav-link" href="#contact">
          Contact
        </Link>
      </div>
    </nav>
  );
}