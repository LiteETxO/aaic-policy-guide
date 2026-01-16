import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, FileText, Scale, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ComplianceStatus = "compliant" | "conditional" | "clarification" | "non-compliant";

interface ComplianceItem {
  id: number;
  itemName: string;
  invoiceRef: string;
  licenseAlignment: ComplianceStatus;
  policyCompliance: ComplianceStatus;
  explanation: string;
}

const sampleData: ComplianceItem[] = [
  {
    id: 1,
    itemName: "Industrial Machinery - CNC Lathe",
    invoiceRef: "INV-2024-0042",
    licenseAlignment: "compliant",
    policyCompliance: "compliant",
    explanation: "Directly supports licensed manufacturing activity as capital equipment.",
  },
  {
    id: 2,
    itemName: "Office Furniture Set",
    invoiceRef: "INV-2024-0042",
    licenseAlignment: "conditional",
    policyCompliance: "conditional",
    explanation: "May qualify if used exclusively for licensed business operations.",
  },
  {
    id: 3,
    itemName: "Vehicle - Toyota Hilux",
    invoiceRef: "INV-2024-0043",
    licenseAlignment: "clarification",
    policyCompliance: "clarification",
    explanation: "Requires verification of intended use within licensed activity scope.",
  },
  {
    id: 4,
    itemName: "Consumer Electronics - TV",
    invoiceRef: "INV-2024-0043",
    licenseAlignment: "non-compliant",
    policyCompliance: "non-compliant",
    explanation: "Not classifiable as capital goods under investment policy guidelines.",
  },
];

const statusConfig: Record<ComplianceStatus, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
  compliant: { icon: CheckCircle2, color: "text-success", label: "Yes", bgColor: "bg-success/10" },
  conditional: { icon: AlertTriangle, color: "text-warning", label: "Conditional", bgColor: "bg-warning/10" },
  clarification: { icon: HelpCircle, color: "text-blue-500", label: "Needs Clarification", bgColor: "bg-blue-500/10" },
  "non-compliant": { icon: XCircle, color: "text-destructive", label: "No", bgColor: "bg-destructive/10" },
};

const StatusBadge = ({ status }: { status: ComplianceStatus }) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", config.bgColor, config.color)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};

const AnalysisResults = () => {
  const compliantCount = sampleData.filter(item => item.policyCompliance === "compliant").length;
  const totalCount = sampleData.length;

  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Analysis Results</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Itemized compliance assessment based on uploaded documents and policy guidelines.
          </p>
          <p className="text-sm text-muted-foreground mt-2">የትንተና ውጤቶች</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
          <Card className="border-l-4 border-l-primary animate-fade-in">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                License Reference
              </CardDescription>
              <CardTitle className="text-lg">Manufacturing - Metal Works</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Sector: Industrial Manufacturing</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Overall Assessment
              </CardDescription>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-success">{compliantCount}</span>
                <span className="text-muted-foreground font-normal">/</span>
                <span>{totalCount}</span>
                <span className="text-sm font-normal text-muted-foreground">items compliant</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-success rounded-full transition-all duration-500"
                  style={{ width: `${(compliantCount / totalCount) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Attention Required
              </CardDescription>
              <CardTitle className="text-lg">
                {sampleData.filter(item => item.policyCompliance !== "compliant").length} items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Require officer review or clarification</p>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Table */}
        <Card className="max-w-6xl mx-auto shadow-medium animate-fade-in" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Itemized Compliance Table
            </CardTitle>
            <CardDescription>Detailed assessment for each invoice item</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Item Name</TableHead>
                    <TableHead className="font-semibold">Invoice Ref</TableHead>
                    <TableHead className="font-semibold">License Alignment</TableHead>
                    <TableHead className="font-semibold">Policy Compliance</TableHead>
                    <TableHead className="font-semibold">Explanation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleData.map((item, index) => (
                    <TableRow 
                      key={item.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${400 + index * 50}ms` }}
                    >
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{item.invoiceRef}</TableCell>
                      <TableCell><StatusBadge status={item.licenseAlignment} /></TableCell>
                      <TableCell><StatusBadge status={item.policyCompliance} /></TableCell>
                      <TableCell className="text-sm max-w-xs">{item.explanation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Advisory Notice */}
        <div className="max-w-4xl mx-auto mt-10">
          <Card className="bg-primary/5 border-primary/20 animate-fade-in" style={{ animationDelay: "600ms" }}>
            <CardContent className="flex items-start gap-4 py-6">
              <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Advisory Notice</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This analysis is provided as decision support only. Based on the reviewed documents, 
                  items have been assessed against current policy guidelines. Final authority for 
                  compliance determination rests with the AAIC officer. Items marked as "Conditional" 
                  or "Needs Clarification" require additional verification before approval.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ይህ ትንተና የውሳኔ ድጋፍ ብቻ ነው። የመጨረሻ ስልጣን ከAAIC ባለስልጣን ጋር ነው።
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AnalysisResults;
