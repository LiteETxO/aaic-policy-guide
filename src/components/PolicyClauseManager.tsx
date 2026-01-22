import { useState, useEffect } from "react";
import {
  BookOpen, Check, CheckCircle2, Edit2, Filter, Loader2, MoreHorizontal,
  RefreshCw, Search, ShieldCheck, Trash2, X, FileText, Tag, Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePolicyDocuments } from "@/hooks/usePolicyDocuments";

interface PolicyClause {
  id: string;
  policy_document_id: string | null;
  policy_document_name: string;
  clause_id: string;
  section_type: string;
  section_number: string;
  page_number: number;
  clause_heading: string;
  clause_heading_amharic: string | null;
  clause_text: string;
  clause_text_amharic: string | null;
  keywords: string[] | null;
  applies_to: string[] | null;
  inclusion_type: string;
  issuing_authority: string | null;
  policy_version: string | null;
  language: string;
  notes: string | null;
  is_verified: boolean | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

const PolicyClauseManager = () => {
  const { isAdmin } = useAuth();
  const { data: policyDocuments } = usePolicyDocuments();
  
  const [clauses, setClauses] = useState<PolicyClause[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [filterSectionType, setFilterSectionType] = useState<string>("all");
  
  const [editingClause, setEditingClause] = useState<PolicyClause | null>(null);
  const [viewingClause, setViewingClause] = useState<PolicyClause | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch clauses
  useEffect(() => {
    fetchClauses();
  }, [selectedDocument]);

  const fetchClauses = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("policy_clauses")
        .select("*")
        .order("section_number", { ascending: true });

      if (selectedDocument !== "all") {
        query = query.eq("policy_document_id", selectedDocument);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClauses(data || []);
    } catch (err) {
      console.error("Error fetching clauses:", err);
      toast.error("Failed to load policy clauses");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter clauses
  const filteredClauses = clauses.filter((clause) => {
    const matchesSearch = 
      searchQuery === "" ||
      clause.clause_heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clause.clause_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clause.clause_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clause.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVerified = 
      filterVerified === "all" ||
      (filterVerified === "verified" && clause.is_verified) ||
      (filterVerified === "unverified" && !clause.is_verified);

    const matchesSectionType = 
      filterSectionType === "all" ||
      clause.section_type === filterSectionType;

    return matchesSearch && matchesVerified && matchesSectionType;
  });

  // Verify clause
  const handleVerify = async (clauseId: string) => {
    try {
      const { error } = await supabase
        .from("policy_clauses")
        .update({ 
          is_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", clauseId);

      if (error) throw error;

      setClauses(prev => 
        prev.map(c => c.id === clauseId ? { ...c, is_verified: true } : c)
      );
      toast.success("Clause verified");
    } catch (err) {
      console.error("Error verifying clause:", err);
      toast.error("Failed to verify clause");
    }
  };

  // Verify all clauses for a document
  const handleVerifyAll = async () => {
    if (selectedDocument === "all") {
      toast.error("Please select a specific document first");
      return;
    }

    try {
      const { error } = await supabase
        .from("policy_clauses")
        .update({ 
          is_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("policy_document_id", selectedDocument)
        .eq("is_verified", false);

      if (error) throw error;

      setClauses(prev => 
        prev.map(c => c.policy_document_id === selectedDocument ? { ...c, is_verified: true } : c)
      );
      toast.success("All clauses verified");
    } catch (err) {
      console.error("Error verifying all clauses:", err);
      toast.error("Failed to verify clauses");
    }
  };

  // Update clause
  const handleUpdateClause = async () => {
    if (!editingClause) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("policy_clauses")
        .update({
          clause_heading: editingClause.clause_heading,
          clause_heading_amharic: editingClause.clause_heading_amharic,
          clause_text: editingClause.clause_text,
          clause_text_amharic: editingClause.clause_text_amharic,
          page_number: editingClause.page_number,
          keywords: editingClause.keywords,
          notes: editingClause.notes,
        })
        .eq("id", editingClause.id);

      if (error) throw error;

      setClauses(prev => 
        prev.map(c => c.id === editingClause.id ? editingClause : c)
      );
      setEditingClause(null);
      toast.success("Clause updated");
    } catch (err) {
      console.error("Error updating clause:", err);
      toast.error("Failed to update clause");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete clause
  const handleDeleteClause = async (clauseId: string) => {
    if (!confirm("Are you sure you want to delete this clause?")) return;

    try {
      const { error } = await supabase
        .from("policy_clauses")
        .delete()
        .eq("id", clauseId);

      if (error) throw error;

      setClauses(prev => prev.filter(c => c.id !== clauseId));
      toast.success("Clause deleted");
    } catch (err) {
      console.error("Error deleting clause:", err);
      toast.error("Failed to delete clause");
    }
  };

  // Count stats
  const verifiedCount = clauses.filter(c => c.is_verified).length;
  const unverifiedCount = clauses.length - verifiedCount;
  const itemCount = clauses.filter(c => c.section_type === "item").length;

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Policy Clause Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review, edit, and verify extracted policy clauses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchClauses}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {selectedDocument !== "all" && unverifiedCount > 0 && (
            <Button variant="hero" size="sm" onClick={handleVerifyAll}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verify All ({unverifiedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{clauses.length}</div>
            <p className="text-xs text-muted-foreground">Total Clauses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{verifiedCount}</div>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{unverifiedCount}</div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{itemCount}</div>
            <p className="text-xs text-muted-foreground">Capital Goods Items</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clauses, keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <Label className="text-xs">Document</Label>
              <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                <SelectTrigger>
                  <SelectValue placeholder="All Documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  {policyDocuments?.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Label className="text-xs">Status</Label>
              <Select value={filterVerified} onValueChange={setFilterVerified}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Label className="text-xs">Section Type</Label>
              <Select value={filterSectionType} onValueChange={setFilterSectionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="annex">Annex</SelectItem>
                  <SelectItem value="item">Item</SelectItem>
                  <SelectItem value="definition">Definition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clauses Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filteredClauses.length} Clauses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredClauses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No clauses found</p>
              <p className="text-sm">Upload a policy document to extract clauses</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[150px]">Clause ID</TableHead>
                    <TableHead>Heading</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[80px]">Page</TableHead>
                    <TableHead className="w-[200px]">Keywords</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClauses.map((clause) => (
                    <TableRow key={clause.id}>
                      <TableCell>
                        {clause.is_verified ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {clause.clause_id}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <p className="font-medium truncate">{clause.clause_heading}</p>
                          {clause.clause_heading_amharic && (
                            <p className="text-xs text-muted-foreground truncate">
                              {clause.clause_heading_amharic}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {clause.section_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{clause.page_number}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {clause.keywords?.slice(0, 3).map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                          {(clause.keywords?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(clause.keywords?.length || 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingClause(clause)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingClause(clause)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!clause.is_verified && (
                              <DropdownMenuItem onClick={() => handleVerify(clause.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Verify
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClause(clause.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* View Clause Dialog */}
      <Dialog open={!!viewingClause} onOpenChange={() => setViewingClause(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingClause?.clause_heading}</DialogTitle>
            <DialogDescription>
              {viewingClause?.clause_id} • Page {viewingClause?.page_number}
            </DialogDescription>
          </DialogHeader>
          {viewingClause && (
            <div className="space-y-4">
              {viewingClause.clause_heading_amharic && (
                <div>
                  <Label className="text-xs text-muted-foreground">Amharic Heading</Label>
                  <p className="mt-1">{viewingClause.clause_heading_amharic}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Clause Text</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{viewingClause.clause_text}</p>
              </div>
              {viewingClause.clause_text_amharic && (
                <div>
                  <Label className="text-xs text-muted-foreground">Amharic Text</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{viewingClause.clause_text_amharic}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{viewingClause.section_type}</Badge>
                <Badge variant="outline">{viewingClause.inclusion_type}</Badge>
                {viewingClause.applies_to?.map((a, i) => (
                  <Badge key={i} variant="outline" className="bg-primary/10">
                    {a}
                  </Badge>
                ))}
              </div>
              {viewingClause.keywords && viewingClause.keywords.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Keywords</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingClause.keywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewingClause.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{viewingClause.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Clause Dialog */}
      <Dialog open={!!editingClause} onOpenChange={() => setEditingClause(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Clause</DialogTitle>
            <DialogDescription>
              {editingClause?.clause_id}
            </DialogDescription>
          </DialogHeader>
          {editingClause && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heading (English)</Label>
                  <Input
                    value={editingClause.clause_heading}
                    onChange={(e) => setEditingClause({ ...editingClause, clause_heading: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Heading (Amharic)</Label>
                  <Input
                    value={editingClause.clause_heading_amharic || ""}
                    onChange={(e) => setEditingClause({ ...editingClause, clause_heading_amharic: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Clause Text (English)</Label>
                <Textarea
                  value={editingClause.clause_text}
                  onChange={(e) => setEditingClause({ ...editingClause, clause_text: e.target.value })}
                  className="min-h-[150px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Clause Text (Amharic)</Label>
                <Textarea
                  value={editingClause.clause_text_amharic || ""}
                  onChange={(e) => setEditingClause({ ...editingClause, clause_text_amharic: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Number</Label>
                  <Input
                    type="number"
                    value={editingClause.page_number}
                    onChange={(e) => setEditingClause({ ...editingClause, page_number: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    value={editingClause.keywords?.join(", ") || ""}
                    onChange={(e) => setEditingClause({ 
                      ...editingClause, 
                      keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingClause.notes || ""}
                  onChange={(e) => setEditingClause({ ...editingClause, notes: e.target.value })}
                  placeholder="Add any notes or context..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditingClause(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateClause} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PolicyClauseManager;
