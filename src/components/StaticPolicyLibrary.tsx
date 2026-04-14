import { useState } from "react";
import { 
  BookOpen, ShieldCheck, FileText, Calendar, ChevronDown, ChevronUp,
  Search, CheckCircle, AlertCircle, List, Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useStaticPolicyDocuments, 
  useCapitalGoods, 
  useCapitalGoodSearch,
  type PolicyDocumentSummary 
} from "@/hooks/useStaticPolicyDocuments";
import { policyDocuments } from "@/data/policyDocuments";
import { cn } from "@/lib/utils";

const StaticPolicyLibrary = () => {
  const { data: documents, isLoading } = useStaticPolicyDocuments();
  const { data: capitalGoods } = useCapitalGoods();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  const { data: searchResults } = useCapitalGoodSearch(searchQuery);

  const toggleClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  const selectedDocument = selectedDoc 
    ? policyDocuments.find(d => d.id === selectedDoc)
    : null;

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="container">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 bg-background">
      <div className="container">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Policy Library</h2>
            <p className="text-sm text-muted-foreground">
              Official policy documents for compliance analysis
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 text-xs ml-auto">
            <ShieldCheck className="h-3 w-3" />
            Built-in
          </Badge>
        </div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="capital-goods" className="gap-2">
              <Package className="h-4 w-4" />
              Capital Goods
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            {/* Document List */}
            <div className="grid md:grid-cols-2 gap-4">
              {documents?.map((doc) => (
                <Card
                  key={doc.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedDoc === doc.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedDoc(doc.id === selectedDoc ? null : doc.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          v{doc.version}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {doc.documentType}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-base mt-3 leading-snug">{doc.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{doc.nameAmharic}</p>
                    {doc.directiveNumber && (
                      <p className="text-xs font-mono text-primary">Directive {doc.directiveNumber}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {doc.effectiveDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.effectiveDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium">Active</span>
                      </div>
                      <div className="text-xs text-muted-foreground">•</div>
                      <span className="text-xs text-muted-foreground">{doc.totalClauses} clauses</span>
                      {doc.totalCapitalGoods && (
                        <>
                          <div className="text-xs text-muted-foreground">•</div>
                          <span className="text-xs text-muted-foreground">{doc.totalCapitalGoods} capital goods</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected Document Clauses */}
            {selectedDocument && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="h-5 w-5" />
                    {selectedDocument.name} — Clauses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDocument.clauses.map((clause) => (
                    <div
                      key={clause.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleClause(clause.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-primary font-medium">
                              {clause.clauseId}
                            </span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {clause.sectionType}
                            </Badge>
                            {clause.isVerified && (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            )}
                          </div>
                          <h4 className="font-medium text-sm">{clause.heading}</h4>
                          {clause.headingAmharic && (
                            <p className="text-xs text-muted-foreground">{clause.headingAmharic}</p>
                          )}
                        </div>
                        {expandedClauses.has(clause.id) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      {expandedClauses.has(clause.id) && (
                        <div className="mt-3 pt-3 border-t text-sm space-y-2">
                          <p>{clause.content}</p>
                          {clause.contentAmharic && (
                            <p className="text-muted-foreground text-xs">{clause.contentAmharic}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="capital-goods" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by HS code, description (English or Amharic)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Capital Goods List */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">HS Code</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {(searchQuery.length >= 2 ? searchResults : capitalGoods)?.map((good, idx) => (
                    <tr key={`${good.hsCode}-${idx}`} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{good.hsCode}</td>
                      <td className="p-3">
                        <p className="font-medium">{good.description}</p>
                        <p className="text-xs text-muted-foreground">{good.descriptionAmharic}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-xs">
                          {good.category}
                        </Badge>
                        {good.subcategory && (
                          <p className="text-xs text-muted-foreground mt-1">{good.subcategory}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {(searchQuery.length >= 2 ? searchResults : capitalGoods)?.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No capital goods found</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl font-bold">{capitalGoods?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total Capital Goods</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl font-bold">
                    {new Set(capitalGoods?.map(g => g.category)).size || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl font-bold">
                    {new Set(capitalGoods?.map(g => g.hsCode)).size || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Unique HS Codes</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default StaticPolicyLibrary;
