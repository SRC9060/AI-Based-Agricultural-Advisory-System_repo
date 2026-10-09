import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import WhyChooseUs from "../components/WhyChooseUs";
import Footer from "../components/Footer";
import HomeSessionRedirect from "./HomeSessionRedirect";

export default function Home() {
  return (
    <main>
      <HomeSessionRedirect />
      <Hero />
      <Features />
      <HowItWorks />
      <WhyChooseUs />
      <Footer />
    </main>
  );
}

