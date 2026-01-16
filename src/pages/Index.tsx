import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PolicyLibrary from "@/components/PolicyLibrary";
import DocumentUpload from "@/components/DocumentUpload";
import AnalysisResults from "@/components/AnalysisResults";
import Footer from "@/components/Footer";

const Index = () => {
  const [showResults, setShowResults] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleAnalyze = (result: any) => {
    setAnalysisData(result);
    setShowResults(true);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <PolicyLibrary />
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
