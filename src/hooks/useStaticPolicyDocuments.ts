import { useQuery } from "@tanstack/react-query";
import { 
  policyDocuments, 
  findCapitalGoodByHSCode, 
  searchCapitalGoods,
  getCapitalGoodCategories,
  type PolicyDocument,
  type CapitalGood 
} from "@/data/policyDocuments";

export interface PolicyDocumentSummary {
  id: string;
  name: string;
  nameAmharic: string;
  directiveNumber: string;
  version: string;
  effectiveDate: string;
  documentType: string;
  totalClauses: number;
  totalCapitalGoods?: number;
}

export const useStaticPolicyDocuments = () => {
  return useQuery({
    queryKey: ["policy-documents-static"],
    queryFn: async (): Promise<PolicyDocumentSummary[]> => {
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return policyDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        nameAmharic: doc.nameAmharic,
        directiveNumber: doc.directiveNumber,
        version: doc.version,
        effectiveDate: doc.effectiveDate,
        documentType: doc.documentType,
        totalClauses: doc.clauses.length,
        totalCapitalGoods: doc.capitalGoods?.length,
      }));
    },
    staleTime: Infinity, // Static data never goes stale
  });
};

export const useStaticPolicyDocument = (id: string) => {
  return useQuery({
    queryKey: ["policy-document-static", id],
    queryFn: async (): Promise<PolicyDocument | null> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return policyDocuments.find(doc => doc.id === id) || null;
    },
    staleTime: Infinity,
    enabled: !!id,
  });
};

export const useCapitalGoods = () => {
  return useQuery({
    queryKey: ["capital-goods-static"],
    queryFn: async (): Promise<CapitalGood[]> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const allGoods: CapitalGood[] = [];
      policyDocuments.forEach(doc => {
        if (doc.capitalGoods) {
          allGoods.push(...doc.capitalGoods);
        }
      });
      return allGoods;
    },
    staleTime: Infinity,
  });
};

export const useCapitalGoodSearch = (query: string) => {
  return useQuery({
    queryKey: ["capital-goods-search", query],
    queryFn: async (): Promise<CapitalGood[]> => {
      if (!query || query.length < 2) return [];
      await new Promise(resolve => setTimeout(resolve, 100));
      return searchCapitalGoods(query);
    },
    staleTime: Infinity,
    enabled: query.length >= 2,
  });
};

export const useCapitalGoodCategories = () => {
  return useQuery({
    queryKey: ["capital-goods-categories"],
    queryFn: async (): Promise<string[]> => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return getCapitalGoodCategories();
    },
    staleTime: Infinity,
  });
};

// Re-export types and utilities
export type { PolicyDocument, CapitalGood };
export { findCapitalGoodByHSCode, searchCapitalGoods, getCapitalGoodCategories };
