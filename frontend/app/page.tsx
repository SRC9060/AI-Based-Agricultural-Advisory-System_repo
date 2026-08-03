import Hero from "../components/Hero";
import HomeSessionRedirect from "./HomeSessionRedirect";

export default function Home() {
  return (
    <main>
      <HomeSessionRedirect />
      <Hero />
    </main>
  );
}
