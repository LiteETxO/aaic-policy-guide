import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DocumentUpload from "@/components/DocumentUpload";
import AnalysisResults from "@/components/AnalysisResults";
import Footer from "@/components/Footer";

const Index = () => {
  const [showResults, setShowResults] = useState(false);

  const handleAnalyze = () => {
    setShowResults(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <DocumentUpload onAnalyze={handleAnalyze} />
        {showResults && (
          <div id="results">
            <AnalysisResults />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
