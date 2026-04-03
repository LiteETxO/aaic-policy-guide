import { forwardRef } from "react";
import type { DecisionReportData, ComplianceItem, Citation, ActionItem } from "./ReportTypes";
import { cn } from "@/lib/utils";

interface DecisionReportProps {
  data: DecisionReportData;
}

const getEligibilityLabel = (status?: string): string => {
  const labels: Record<string, string> = {
    "Eligible – Listed Capital Good": "Eligible — Listed Capital Good",
    "Eligible – Listed Capital Good (Mapped)": "Eligible — Listed Capital Good (Mapped)",
    "Eligible – Essential Capital Good (Not Listed)": "Eligible — Essential Capital Good",
    "Requires Clarification": "Requires Clarification",
    "Not Eligible": "Not Eligible",
    "Compliant": "Compliant",
    "Conditional": "Conditional",
    "Needs Clarification": "Needs Clarification",
    "Non-Compliant": "Non-Compliant",
  };
  return labels[status || ""] || status || "Unknown";
};

const getLicenseLabel = (status?: string): string => {
  const labels: Record<string, string> = {
    "Aligned": "Aligned",
    "Conditional": "Conditional",
    "Needs Clarification": "Needs Clarification",
    "Not Aligned": "Not Aligned",
  };
  return labels[status || ""] || status || "Unknown";
};

const getMatchMethodLabel = (method?: string): string => {
  const labels: Record<string, string> = {
    "Exact": "Exact List Match",
    "Mapped": "Mapped / Semantic / Alias",
    "Essential": "Essential — Not Listed",
    "Not Matched": "Not Matched",
  };
  return labels[method || ""] || method || "Unknown";
};

const getSeverityLabel = (severity: string): string => {
  const labels: Record<string, string> = {
    "high": "High Priority",
    "medium": "Medium Priority",
    "low": "Low Priority",
  };
  return labels[severity] || severity;
};

const getActionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    "missing": "Missing",
    "unreadable": "Unreadable",
    "conflict": "Conflict",
    "policy-gap": "Policy Gap",
    "missing-evidence": "Missing Evidence",
    "ambiguous-mapping": "Ambiguous Mapping",
  };
  return labels[type] || type;
};

// Cover Page Component
const CoverPage = ({ metadata }: { metadata: DecisionReportData["metadata"] }) => (
  <div className="page-break-after min-h-[800px] flex flex-col justify-center items-center text-center p-12">
    <div className="mb-12">
      <h1 className="text-3xl font-bold mb-4 text-foreground">
        AAIC Investment Incentives
      </h1>
      <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
        Policy Compliance Analysis
      </h2>
    </div>

    <div className="space-y-6 text-left w-full max-w-md mx-auto border-t border-b py-8">
      <div>
        <p className="text-sm text-muted-foreground">Investor Name</p>
        <p className="text-lg font-semibold">{metadata.investorName || "Not Specified"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">License Number</p>
        <p className="text-lg font-mono">{metadata.licenseNumber || "Not Specified"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Case Reference ID</p>
        <p className="text-lg font-mono">{metadata.caseReferenceId || "Not Specified"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Date of Analysis</p>
        <p className="text-lg">{metadata.dateOfAnalysis}</p>
      </div>
    </div>

    <div className="mt-8">
      <p className="text-sm text-muted-foreground mb-2">Prepared by</p>
      <p className="font-medium">{metadata.preparedBy}</p>
    </div>

    <div className="mt-12 p-4 bg-muted/30 rounded-lg max-w-lg">
      <p className="text-xs text-muted-foreground italic leading-relaxed">
        <strong>Disclaimer:</strong> This analysis is advisory and intended to support AAIC officers.
        Final decisions rest with the Commission.
      </p>
    </div>
  </div>
);

// Executive Summary Section
const ExecutiveSummarySection = ({ summary, total }: { summary: DecisionReportData["executiveSummary"]; total: number }) => (
  <section className="page-break-inside-avoid mb-8">
    <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
      1. Executive Summary
    </h2>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="p-4 border rounded">
        <p className="text-sm text-muted-foreground">Overall Status</p>
        <p className="text-lg font-bold">{summary.overallStatus}</p>
      </div>
      <div className="p-4 border rounded">
        <p className="text-sm text-muted-foreground">Items Reviewed</p>
        <p className="text-lg font-bold">{total}</p>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="p-4 border rounded text-center">
        <p className="text-2xl font-bold text-success">{summary.eligibleCount}</p>
        <p className="text-sm text-muted-foreground">Eligible</p>
      </div>
      <div className="p-4 border rounded text-center">
        <p className="text-2xl font-bold text-warning">{summary.clarificationCount}</p>
        <p className="text-sm text-muted-foreground">Needs Clarification</p>
      </div>
      <div className="p-4 border rounded text-center">
        <p className="text-2xl font-bold text-destructive">{summary.notEligibleCount}</p>
        <p className="text-sm text-muted-foreground">Not Eligible</p>
      </div>
    </div>

    {summary.topIssues.length > 0 && (
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Key Issues:</h4>
        <ul className="list-disc pl-6 space-y-1">
          {summary.topIssues.map((issue, i) => (
            <li key={i} className="text-sm">{issue}</li>
          ))}
        </ul>
      </div>
    )}

    {summary.recommendation && (
      <div className="p-4 bg-muted/30 rounded mt-4">
        <h4 className="font-semibold mb-2">Officer Action Recommendation:</h4>
        <p className="text-sm">{summary.recommendation}</p>
      </div>
    )}
  </section>
);

// MANDATORY: Investor, License & Interpretation Basis Section
const InvestorLicenseInterpretationSection = ({
  metadata,
  license,
  items,
  policyBasis
}: {
  metadata: DecisionReportData["metadata"];
  license?: DecisionReportData["licenseSnapshot"];
  items: DecisionReportData["complianceItems"];
  policyBasis: DecisionReportData["policyBasis"];
}) => {
  // Find first matched policy document for guideline reference
  const guidelineRef = policyBasis?.[0];

  return (
    <section className="page-break-inside-avoid mb-8">
      <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
        2. Investor, License & Interpretation Basis
      </h2>

      <div className="border-2 border-primary/30 rounded-lg p-4 mb-6 bg-primary/5">
        <p className="text-xs text-muted-foreground italic mb-4">
          This section is mandatory — report generation blocked without it
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Company/Investor Name */}
          <div className="p-3 border rounded bg-background">
            <p className="text-xs text-muted-foreground mb-1">Company / Investor Name</p>
            <p className="font-semibold">{metadata.investorName || "Not Specified"}</p>
          </div>

          {/* License Number */}
          <div className="p-3 border rounded bg-background">
            <p className="text-xs text-muted-foreground mb-1">License Number</p>
            <p className="font-mono">{metadata.licenseNumber || license?.licenseNumber || "Not Specified"}</p>
          </div>
        </div>

        {/* License Name/Activity - Full Width */}
        <div className="p-3 border rounded bg-background mb-4">
          <p className="text-xs text-muted-foreground mb-1">License Name / Activity — <span className="italic">Verbatim from license</span></p>
          <p className="font-semibold">{license?.licensedActivity || "Not Specified"}</p>
        </div>

        {/* License Category */}
        {license?.sector && (
          <div className="p-3 border rounded bg-background mb-4">
            <p className="text-xs text-muted-foreground mb-1">License Category / Type</p>
            <p className="font-semibold">{license.sector}</p>
          </div>
        )}

        {/* Guideline Mapping */}
        <div className="p-3 border rounded bg-background">
          <p className="text-xs text-muted-foreground mb-1">Guideline Mapping</p>
          {guidelineRef ? (
            <div className="space-y-1">
              <p className="font-semibold">{guidelineRef.documentName}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-muted-foreground">Article: {guidelineRef.relevantArticles?.[0] || "N/A"}</span>
                <span className="text-muted-foreground">Page: {guidelineRef.pageNumbers?.[0] || "N/A"}</span>
              </div>
            </div>
          ) : (
            <p className="text-destructive">🚫 Guideline Mapping Not Found</p>
          )}
        </div>
      </div>

      {/* Goods Interpretation Summary Table */}
      <div className="mb-4">
        <h4 className="font-semibold mb-3">Goods Interpretation Summary</h4>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border p-2 text-left">#</th>
              <th className="border p-2 text-left">Invoice Description</th>
              <th className="border p-2 text-left">Interpretation Method</th>
              <th className="border p-2 text-left">Eligibility</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((item, i) => (
              <tr key={i}>
                <td className="border p-2 font-mono">{item.itemNumber}</td>
                <td className="border p-2 max-w-[200px] truncate">{item.invoiceItem}</td>
                <td className="border p-2">{getMatchMethodLabel(item.matchResult)}</td>
                <td className="border p-2">{getEligibilityLabel(item.eligibilityStatus || item.policyCompliance)}</td>
              </tr>
            ))}
            {items.length > 10 && (
              <tr>
                <td colSpan={4} className="border p-2 text-center text-muted-foreground italic">
                  ... and {items.length - 10} more items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// Documents Reviewed Section
const DocumentsReviewedSection = ({ documents }: { documents: DecisionReportData["documentsReviewed"] }) => (
  <section className="page-break-inside-avoid mb-8">
    <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
      3. Documents Reviewed
    </h2>

    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted/50">
          <th className="border p-2 text-left">Document Name</th>
          <th className="border p-2 text-left">Type</th>
          <th className="border p-2 text-left">Language</th>
          <th className="border p-2 text-center">Pages</th>
          <th className="border p-2 text-left">Readability</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc, i) => (
          <tr key={i}>
            <td className="border p-2">{doc.documentName}</td>
            <td className="border p-2">{doc.documentType}</td>
            <td className="border p-2">{doc.languagesDetected?.join(", ") || "—"}</td>
            <td className="border p-2 text-center">{doc.pageCount || "—"}</td>
            <td className="border p-2">
              {doc.readStatus === "Complete" ? "OK" :
               doc.readStatus === "Partial" ? "Partial" :
               "Issues Noted"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

// Policy Basis Section
const PolicyBasisSection = ({ policies }: { policies: DecisionReportData["policyBasis"] }) => (
  <section className="page-break-inside-avoid mb-8">
    <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
      4. Policy Basis
    </h2>

    {policies.length === 0 ? (
      <p className="text-muted-foreground italic">No policy documents specified</p>
    ) : (
      <div className="space-y-6">
        {policies.map((policy, i) => (
          <div key={i} className="border rounded p-4">
            <h4 className="font-semibold mb-2">{policy.documentName}</h4>
            {policy.issuingAuthority && (
              <p className="text-sm text-muted-foreground mb-2">
                Issuing Authority: {policy.issuingAuthority}
              </p>
            )}
            <div className="mb-2">
              <span className="text-sm font-medium">Relevant Articles: </span>
              <span className="text-sm">{policy.relevantArticles.join(", ")}</span>
            </div>
            <div className="mb-2">
              <span className="text-sm font-medium">Pages: </span>
              <span className="text-sm">{policy.pageNumbers.join(", ")}</span>
            </div>
            {policy.quotedClauses.length > 0 && (
              <div className="mt-3 pl-4 border-l-2 border-muted">
                {policy.quotedClauses.map((clause, j) => (
                  <p key={j} className="text-sm italic text-muted-foreground mb-2">"{clause}"</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </section>
);

// Itemized Analysis Table Section
const ItemizedAnalysisSection = ({ items }: { items: ComplianceItem[] }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
      5. Itemized Analysis Table
    </h2>

    {items.map((item, i) => (
      <div key={i} className="page-break-inside-avoid border rounded mb-4 overflow-hidden">
        <div className="bg-muted/50 p-3 border-b">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-mono text-sm">#{item.itemNumber}</span>
              <h4 className="font-semibold">{item.normalizedName || item.invoiceItem || "Item"}</h4>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{getEligibilityLabel(item.eligibilityStatus || item.policyCompliance)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-xs">Invoice Description</p>
              <p>{item.invoiceItem}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Matching Method</p>
              <p>{getMatchMethodLabel(item.matchResult)}</p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">License Alignment</p>
            <p>{getLicenseLabel(item.licenseAlignment)}</p>
            {item.licenseEvidence && (
              <p className="text-muted-foreground italic mt-1">"{item.licenseEvidence}"</p>
            )}
          </div>

          {/* Citations */}
          {item.citations && item.citations.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-2">Policy Citations</p>
              {item.citations.map((citation, j) => (
                <div key={j} className="pl-3 border-l-2 border-muted mb-2">
                  <p className="font-medium text-xs">{citation.documentName} - {citation.articleSection} (p.{citation.pageNumber})</p>
                  <p className="italic text-muted-foreground text-xs">"{citation.quote}"</p>
                </div>
              ))}
            </div>
          )}

          {/* Reasoning */}
          {item.reasoning && item.reasoning.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Reasoning Summary</p>
              <ul className="list-disc pl-4 space-y-1">
                {item.reasoning.map((r, j) => (
                  <li key={j} className="text-xs">{r.point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    ))}
  </section>
);

// Analytical Notes Section
const AnalyticalNotesSection = ({ notes }: { notes?: DecisionReportData["analyticalNotes"] }) => {
  if (!notes) return null;

  const hasContent =
    notes.nameMismatchHandling.length > 0 ||
    notes.essentialityDecisions.length > 0 ||
    notes.conservativeAssumptions.length > 0 ||
    notes.officerDiscretion.length > 0;

  if (!hasContent) return null;

  return (
    <section className="page-break-inside-avoid mb-8">
      <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
        6. Analytical Reasoning Notes
      </h2>

      <div className="space-y-4">
        {notes.nameMismatchHandling.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Name Mismatch Handling</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {notes.nameMismatchHandling.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {notes.essentialityDecisions.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Essentiality Decisions</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {notes.essentialityDecisions.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {notes.conservativeAssumptions.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Conservative Assumptions</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {notes.conservativeAssumptions.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {notes.officerDiscretion.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Left to Officer Discretion</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {notes.officerDiscretion.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

// Issues & Clarifications Section
const IssuesSection = ({ issues }: { issues: ActionItem[] }) => {
  if (issues.length === 0) return null;

  return (
    <section className="page-break-inside-avoid mb-8">
      <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
        7. Issues & Clarifications Required
      </h2>

      <div className="space-y-4">
        {issues.map((issue, i) => (
          <div
            key={i}
            className={cn(
              "border rounded p-4",
              issue.severity === "high" && "border-destructive/50 bg-destructive/5",
              issue.severity === "medium" && "border-warning/50 bg-warning/5",
              issue.severity === "low" && "bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-sm">{getSeverityLabel(issue.severity)}</span>
              <span className="text-muted-foreground text-sm">|</span>
              <span className="text-sm">{getActionTypeLabel(issue.type)}</span>
            </div>
            <p className="text-sm mb-3">{issue.description}</p>

            {(issue.whatIsMissing || issue.whyItMatters || issue.resolutionAction) && (
              <div className="text-sm space-y-2 pl-4 border-l-2 border-muted">
                {issue.whatIsMissing && (
                  <p><strong>What is Missing:</strong> {issue.whatIsMissing}</p>
                )}
                {issue.whyItMatters && (
                  <p><strong>Why it Matters:</strong> {issue.whyItMatters}</p>
                )}
                {issue.resolutionAction && (
                  <p><strong>Resolution:</strong> {issue.resolutionAction}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// Conclusion Section
const ConclusionSection = ({ conclusion, license }: {
  conclusion: DecisionReportData["conclusion"];
  license?: DecisionReportData["licenseSnapshot"]
}) => (
  <section className="page-break-inside-avoid mb-8">
    <h2 className="text-xl font-bold border-b-2 border-primary pb-2 mb-6">
      8. Conclusion & Officer Next Steps
    </h2>

    {conclusion.canProceed.length > 0 && (
      <div className="mb-4">
        <h4 className="font-semibold text-success mb-2">Can Proceed</h4>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          {conclusion.canProceed.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    {conclusion.requiresClarification.length > 0 && (
      <div className="mb-4">
        <h4 className="font-semibold text-warning mb-2">Requires Clarification</h4>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          {conclusion.requiresClarification.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    {conclusion.cannotApprove.length > 0 && (
      <div className="mb-4">
        <h4 className="font-semibold text-destructive mb-2">Cannot Approve Under Current Evidence</h4>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          {conclusion.cannotApprove.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded">
      <h4 className="font-semibold mb-2">Officer Authority Reminder</h4>
      <p className="text-sm text-muted-foreground">{conclusion.officerAuthorityReminder}</p>
    </div>
  </section>
);

// Main Decision Report Component
export const DecisionReport = forwardRef<HTMLDivElement, DecisionReportProps>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="decision-report bg-background text-foreground p-8 max-w-4xl mx-auto"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <CoverPage metadata={data.metadata} />

        <div className="page-break-before">
          <ExecutiveSummarySection
            summary={data.executiveSummary}
            total={data.complianceItems.length}
          />

          {/* MANDATORY: Investor, License & Interpretation Basis */}
          <InvestorLicenseInterpretationSection
            metadata={data.metadata}
            license={data.licenseSnapshot}
            items={data.complianceItems}
            policyBasis={data.policyBasis}
          />

          <DocumentsReviewedSection documents={data.documentsReviewed} />

          <PolicyBasisSection policies={data.policyBasis} />

          <ItemizedAnalysisSection items={data.complianceItems} />

          <AnalyticalNotesSection notes={data.analyticalNotes} />

          <IssuesSection issues={data.issuesAndClarifications} />

          <ConclusionSection
            conclusion={data.conclusion}
            license={data.licenseSnapshot}
          />
        </div>

        {/* Footer on each page */}
        <div className="print-footer text-xs text-muted-foreground text-center mt-8 pt-4 border-t">
          <p>AAIC Policy Decision Support System</p>
          <p>This analysis is advisory</p>
        </div>
      </div>
    );
  }
);

DecisionReport.displayName = "DecisionReport";
