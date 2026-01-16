import { Shield, FileCheck, Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden gradient-hero py-16 lg:py-24">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm mb-6 animate-fade-in">
            <Shield className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium text-primary-foreground/90">
              Addis Ababa Investment Commission
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in tracking-tight">
            Policy Interpretation &<br />
            <span className="text-secondary">Decision Support AI</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-4 animate-fade-in max-w-2xl mx-auto">
            Accurately analyze investment licenses, invoices, and Ministry of Finance guidelines 
            to determine capital goods compliance.
          </p>

          <p className="text-base text-primary-foreground/60 mb-8 animate-fade-in">
            የኢንቨስትመንት ፈቃዶችን እና ደረሰኞችን በትክክል ይተነትኑ
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button variant="gold" size="xl" className="gap-2">
              Start Analysis
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              View Documentation
            </Button>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
          {[
            {
              icon: FileCheck,
              title: "Document Analysis",
              desc: "OCR-powered processing of licenses, invoices, and policy documents",
            },
            {
              icon: Scale,
              title: "Compliance Check",
              desc: "Cross-reference items against Ministry of Finance guidelines",
            },
            {
              icon: Shield,
              title: "Decision Support",
              desc: "Clear recommendations with full transparency and reasoning",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center p-6 rounded-xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-lg gradient-gold flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-primary-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-primary-foreground/70">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
