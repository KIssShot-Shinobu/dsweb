import { Navbar } from "@/components/ui/navbar";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Socials } from "@/components/sections/socials";
import { Tournaments } from "@/components/sections/tournaments";
import { Footer } from "@/components/ui/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent">
      <Navbar />
      <Hero />
      <About />
      <Tournaments />
      <Socials />
      <Footer />
    </main>
  );
}
