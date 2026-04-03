import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionReportData, ComplianceItem, ActionItem } from "@/components/report/ReportTypes";

interface AnalysisReportProps {
  analysisData: any;
  onBack: () => void;
}

type DecisionFilter = "ALL" | "ELIGIBLE" | "EXCLUDED" | "REVIEW";

const getDecisionType = (status: string): "ELIGIBLE" | "EXCLUDED" | "REVIEW" => {
  if (!status) return "REVIEW";
  if (status.startsWith("Eligible")) return "ELIGIBLE";
  if (status === "Not Eligible") return "EXCLUDED";
  return "REVIEW";
};

const DECISION_BADGE: Record<string, string> = {
  ELIGIBLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EXCLUDED: "bg-red-50 text-red-700 border-red-200",
  REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
};

const DECISION_LABEL: Record<string, string> = {
  ELIGIBLE: "Eligible",
  EXCLUDED: "Excluded",
  REVIEW: "Review",
};

export const AnalysisReport = ({ analysisData, onBack }: AnalysisReportProps) => {
  const [filter, setFilter] = useState<DecisionFilter>("ALL");

  const report = analysisData as DecisionReportData;
  const metadata = report?.metadata;
  const executive = report?.executiveSummary;
  const items: ComplianceItem[] = report?.complianceItems || [];
  const licenseSnapshot = report?.licenseSnapshot;
  const reviewItems: ActionItem[] = report?.issuesAndClarifications || [];

  const dateGenerated = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const reportRef =
    metadata?.caseReferenceId || `AAIC-${Date.now().toString(36).toUpperCase()}`;

  const totalItems = items.length;
  const eligibleCount =
    executive?.eligibleCount ??
    items.filter((i) => getDecisionType(i.eligibilityStatus || "") === "ELIGIBLE").length;
  const excludedCount =
    (executive as any)?.notEligibleCount ??
    items.filter((i) => getDecisionType(i.eligibilityStatus || "") === "EXCLUDED").length;
  const reviewCount =
    executive?.clarificationCount ??
    items.filter((i) => getDecisionType(i.eligibilityStatus || "") === "REVIEW").length;

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((item) => getDecisionType(item.eligibilityStatus || "") === filter);
  }, [items, filter]);

  const handlePrint = () => window.print();

  const showReviewSection =
    reviewItems.length > 0 ||
    items.some((i) => getDecisionType(i.eligibilityStatus || "") === "REVIEW");

  return (
    <>
      {/* Print styles injected via style tag */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { max-width: 100% !important; padding: 24px !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 print:bg-white">
        {/* Toolbar */}
        <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            New Analysis
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            className="gap-2 bg-slate-800 hover:bg-slate-700 text-white"
          >
            <Printer className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Report */}
        <div className="print-page max-w-5xl mx-auto px-6 py-8">
          {/* ── Report Header ── */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    AAIC Policy Compliance Analysis
                  </h1>
                  <p className="text-sm text-slate-500">
                    Investment &amp; Capital Goods Duty Exemption Review
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 space-y-0.5">
                <p>
                  <span className="font-semibold">Date:</span> {dateGenerated}
                </p>
                <p>
                  <span className="font-semibold">Ref:</span> {reportRef}
                </p>
                <p>
                  <span className="font-semibold">Directive:</span> 1064/2025
                </p>
              </div>
            </div>
            <hr className="border-slate-300" />
          </div>

          {/* ── Section 1: Investment Permit Summary ── */}
          <ReportSection title="1. Investment Permit Summary">
            <DetailTable
              rows={[
                { label: "Company / Investor", value: metadata?.investorName || "—" },
                { label: "Permit Number", value: metadata?.licenseNumber || "—" },
                {
                  label: "Licensed Activity",
                  value: licenseSnapshot?.licensedActivity || "—",
                },
                { label: "Sector", value: licenseSnapshot?.sector || "—" },
                {
                  label: "Location / Scope",
                  value: licenseSnapshot?.scopeOfOperation || "—",
                },
                {
                  label: "Legal Basis",
                  value:
                    report?.policyBasis?.[0]?.documentName ||
                    "Investment Capital Goods Exemption Directive No. 1064/2025",
                },
              ]}
            />
          </ReportSection>

          {/* ── Section 2: Invoice Details ── */}
          <ReportSection title="2. Invoice Details">
            <DetailTable
              rows={[
                {
                  label: "Total Line Items",
                  value: String(
                    report?.analysisCompleteness?.totalInvoiceItems || items.length
                  ),
                },
                {
                  label: "Items Analyzed",
                  value: String(
                    report?.analysisCompleteness?.analyzedItems || items.length
                  ),
                },
                {
                  label: "Invoice Language",
                  value:
                    report?.documentComprehension?.invoiceUnderstanding?.invoiceLanguage ||
                    "—",
                },
                {
                  label: "Readability Status",
                  value:
                    report?.documentComprehension?.invoiceUnderstanding?.readabilityStatus ||
                    "—",
                },
                {
                  label: "Analysis Date",
                  value: metadata?.dateOfAnalysis || dateGenerated,
                },
                {
                  label: "Prepared By",
                  value:
                    metadata?.preparedBy ||
                    "AAIC Policy Decision Support System",
                },
              ]}
            />
          </ReportSection>

          {/* ── Section 3: Executive Summary ── */}
          <ReportSection title="3. Executive Summary">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <StatCard label="Total Items" value={totalItems} variant="slate" />
              <StatCard label="Eligible" value={eligibleCount} variant="emerald" />
              <StatCard label="Excluded" value={excludedCount} variant="red" />
              <StatCard label="Requires Review" value={reviewCount} variant="amber" />
            </div>
            {executive?.recommendation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                <span className="font-semibold text-blue-800">Recommendation: </span>
                {executive.recommendation}
              </div>
            )}
          </ReportSection>

          {/* ── Section 4: Compliance Analysis ── */}
          <ReportSection
            title="4. Compliance Analysis"
            headerRight={
              <div className="no-print flex items-center gap-1.5">
                {(["ALL", "ELIGIBLE", "EXCLUDED", "REVIEW"] as DecisionFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                      filter === f
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                    )}
                  >
                    {f === "ALL"
                      ? `All (${totalItems})`
                      : f === "ELIGIBLE"
                      ? `Eligible (${eligibleCount})`
                      : f === "EXCLUDED"
                      ? `Excluded (${excludedCount})`
                      : `Review (${reviewCount})`}
                  </button>
                ))}
              </div>
            }
          >
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 w-10">
                      #
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">
                      Item Description
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 w-32">
                      Category / Specs
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 w-28">
                      Decision
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">
                      Policy Basis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const decision = getDecisionType(item.eligibilityStatus || "");
                    const categoryOrSpecs = item.category || item.specs || "—";
                    const citation = item.citations?.[0];
                    const policyBasis = citation
                      ? `${citation.documentName} — ${citation.articleSection}`
                      : item.eligibilityStatus || "—";

                    return (
                      <tr
                        key={item.itemNumber}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                      >
                        <td className="py-2.5 px-3 text-slate-400 text-xs">
                          {item.itemNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-slate-800 font-medium text-sm leading-snug">
                            {item.normalizedName || item.invoiceItem}
                          </p>
                          {item.normalizedName &&
                            item.normalizedName !== item.invoiceItem && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {item.invoiceItem}
                              </p>
                            )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">
                          {categoryOrSpecs}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
                              DECISION_BADGE[decision]
                            )}
                          >
                            {DECISION_LABEL[decision]}
                          </span>
                        </td>
                        <td
                          className="py-2.5 px-3 text-slate-500 text-xs max-w-xs"
                          title={policyBasis}
                        >
                          <span className="line-clamp-2">{policyBasis}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-sm text-slate-400"
                      >
                        No items match the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReportSection>

          {/* ── Section 5: Items Requiring Review ── */}
          {showReviewSection && (
            <ReportSection title="5. Items Requiring Review">
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {reviewItems.length > 0
                  ? reviewItems.map((issue, idx) => (
                      <div key={idx} className="p-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 shrink-0 text-xs px-2 py-0.5 rounded-full border font-semibold",
                              issue.severity === "high"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : issue.severity === "medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            {issue.severity}
                          </span>
                          <div>
                            <p className="text-sm text-slate-700">{issue.description}</p>
                            {issue.resolutionAction && (
                              <p className="text-xs text-slate-500 mt-1">
                                <span className="font-medium">Action:</span>{" "}
                                {issue.resolutionAction}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  : items
                      .filter(
                        (i) => getDecisionType(i.eligibilityStatus || "") === "REVIEW"
                      )
                      .map((item) => (
                        <div key={item.itemNumber} className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 shrink-0 text-xs px-2 py-0.5 rounded-full border font-semibold bg-amber-50 text-amber-700 border-amber-200">
                              review
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                Item {item.itemNumber}:{" "}
                                {item.normalizedName || item.invoiceItem}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.eligibilityStatus} —{" "}
                                {item.licenseEvidence ||
                                  "Further review required"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
              </div>
            </ReportSection>
          )}

          {/* ── Footer ── */}
          <footer className="mt-12 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            Generated by AAIC Policy Decision Support System | Directive 1064/2025 |{" "}
            {dateGenerated}
          </footer>
        </div>
      </div>
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

const ReportSection = ({ title, children, headerRight }: ReportSectionProps) => (
  <section className="mb-8">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
        {title}
      </h2>
      {headerRight}
    </div>
    {children}
  </section>
);

interface DetailTableProps {
  rows: { label: string; value: string }[];
}

const DetailTable = ({ rows }: DetailTableProps) => (
  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row, idx) => (
          <tr key={row.label} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
            <td className="py-2.5 px-4 text-xs font-semibold text-slate-500 w-48 border-r border-slate-100">
              {row.label}
            </td>
            <td className="py-2.5 px-4 text-sm text-slate-800">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface StatCardProps {
  label: string;
  value: number;
  variant: "slate" | "emerald" | "red" | "amber";
}

const StatCard = ({ label, value, variant }: StatCardProps) => {
  const styles: Record<string, string> = {
    slate: "bg-slate-800 text-white",
    emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    red: "bg-red-50 text-red-800 border border-red-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
  };
  return (
    <div className={cn("rounded-lg p-4", styles[variant])}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-80 font-medium">{label}</div>
    </div>
  );
};
