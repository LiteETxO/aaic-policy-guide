import { BookOpen, ShieldCheck, Lock, FileText, Calendar, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PolicyDocument {
  id: string;
  name: string;
  nameAmharic: string;
  version: string;
  effectiveDate: string;
  addedBy: string;
  articles: number;
  pages: number;
}

const policyDocuments: PolicyDocument[] = [
  {
    id: "mof-2023-001",
    name: "Capital Goods Import Guidelines",
    nameAmharic: "የካፒታል ዕቃዎች ማስመጫ መመሪያ",
    version: "2.1",
    effectiveDate: "2023-07-01",
    addedBy: "Admin",
    articles: 24,
    pages: 48,
  },
  {
    id: "mof-2022-003",
    name: "Investment Incentives Directive",
    nameAmharic: "የኢንቨስትመንት ማበረታቻ መመሪያ",
    version: "1.3",
    effectiveDate: "2022-11-15",
    addedBy: "Admin",
    articles: 18,
    pages: 32,
  },
  {
    id: "mof-2024-001",
    name: "Eligible Capital Equipment List",
    nameAmharic: "ብቁ የካፒታል መሳሪያዎች ዝርዝር",
    version: "3.0",
    effectiveDate: "2024-01-01",
    addedBy: "Admin",
    articles: 12,
    pages: 28,
  },
];

const PolicyLibrary = () => {
  return (
    <section className="py-12 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Policy Library</h2>
              <Badge variant="outline" className="gap-1.5 text-xs">
                <Lock className="h-3 w-3" />
                Admin Managed
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Official Ministry of Finance policy documents — the permanent source of truth for compliance decisions.
            </p>
            <p className="text-sm text-muted-foreground mt-1">የፖሊሲ ቤተ-መጽሐፍት • የውሳኔ ድጋፍ መሠረት</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {policyDocuments.map((doc, index) => (
            <Card 
              key={doc.id} 
              className="relative overflow-hidden animate-fade-in group hover:shadow-medium transition-shadow"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    v{doc.version}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-3 leading-snug">{doc.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{doc.nameAmharic}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.effectiveDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {doc.addedBy}
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs font-medium">{doc.articles} Articles</span>
                  </div>
                  <div className="text-xs text-muted-foreground">•</div>
                  <span className="text-xs text-muted-foreground">{doc.pages} pages</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">All citations must reference this library</p>
              <p className="text-xs text-muted-foreground mt-1">
                Every compliance statement includes: Document Name, Article/Section, Page Number, and direct quote.
                If a needed rule is not found, the system will flag it for admin update or manual legal review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PolicyLibrary;
