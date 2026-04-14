// Static policy documents for AAIC Policy Guide
// Extracted from Directive 1014/2025 and Directive 1064 Annexes

export interface PolicyClause {
  id: string;
  clauseId: string;
  heading: string;
  headingAmharic?: string;
  content: string;
  contentAmharic?: string;
  sectionType: "eligibility" | "incentive" | "procedure" | "restriction" | "definition";
  pageNumber?: number;
  isVerified: boolean;
}

export interface PolicyDocument {
  id: string;
  name: string;
  nameAmharic: string;
  directiveNumber: string;
  version: string;
  effectiveDate: string;
  documentType: "primary" | "supplemental" | "annex";
  clauses: PolicyClause[];
  capitalGoods?: CapitalGood[];
}

export interface CapitalGood {
  hsCode: string;
  description: string;
  descriptionAmharic: string;
  category: string;
  subcategory?: string;
}

// Main Investment Incentives Regulation (Directive 1014/2025)
export const investmentIncentivesRegulation: PolicyDocument = {
  id: "policy-1014-2025",
  name: "Investment Incentives Regulation",
  nameAmharic: "የኢንቨስትመንት ማበረታቻ ደንብ",
  directiveNumber: "1014/2025",
  version: "4.0",
  effectiveDate: "2025-01-01",
  documentType: "primary",
  clauses: [
    {
      id: "clause-1",
      clauseId: "1",
      heading: "Short Title",
      headingAmharic: "አጭር ርዕስ",
      content: "This Regulation may be cited as the 'Investment Incentives Council of Ministers Regulation No. ___/2018'",
      contentAmharic: 'ይህ ደንብ "የኢንቨስትመንት ማበረታቻ የሚኒስትሮች ምክር ቤት ደንብ ቁጥር /2018" ተብሎ ሊጠቀስ ይችላል፡፡',
      sectionType: "definition",
      isVerified: true,
    },
    {
      id: "clause-2-1",
      clauseId: "2(1)",
      heading: "Investment Incentive Definition",
      headingAmharic: "የኢንቨስትመንት ማበረታቻ ትርጓሜ",
      content: "'Investment Incentive' means the incentives listed under Article 6 of this Regulation for an investment eligible for incentive.",
      contentAmharic: '"የኢንቨስትመንት ማበረታቻ" ማለት በዚህ ደንብ መሰረት ለማበረታቻ ብቁ ለሆነ ኢንቨስትመንት በዚህ ደንብ አንቀጽ 6 የተዘረዘሩት ማበረታቻዎች ናቸው፡፡',
      sectionType: "definition",
      isVerified: true,
    },
    {
      id: "clause-2-2",
      clauseId: "2(2)",
      heading: "Investment Capital Allowance",
      headingAmharic: "የኢንቨስትመንት ካፒታል አላዋንስ",
      content: "'Investment Capital Allowance' means a one-time deductible expense calculated as a percentage of the expenditure on capital assets when the investment commences operation.",
      contentAmharic: '"የኢንቨስትመንት ካፒታል አላዋንስ" ማለት አንድ ኢንቨስትመንት ስራ በሚጀምርበት ወቅት ለካፒታል ንብረቶች ባወጣው ወጪ ላይ በተወሰነ መቶኛ የሚሰላ ለአንድ ጊዜ ብቻ የሚፈቀድ ተቀናሽ ወጪ ነው።',
      sectionType: "definition",
      isVerified: true,
    },
    {
      id: "clause-2-7",
      clauseId: "2(7)",
      heading: "Capital Goods Definition",
      headingAmharic: "የካፒታል ዕቃ ትርጓሜ",
      content: "'Capital Goods' means equipment used for producing goods for sale or providing services, having economic benefit for not less than one year, including machinery and other tangible assets with substantial value.",
      contentAmharic: '"ካፒታል" ማለት ለሽያጭ የሚውሉ ምርቶችን ለማምረት ወይም አገልግሎቶችን ለመስጠት ጥቅም ላይ የሚውል፣ ከአንድ ዓመት ላላነሰ ጊዜ ኢኮኖሚያዊ ጠቀሜታ ያለው መሣሪያን እና እነዚህን የመሳሰሉ ግዙፋዊ ሀልዎት ያላቸውን ሌሎች ንብረቶች ይጨምራል።',
      sectionType: "definition",
      isVerified: true,
    },
    {
      id: "clause-4",
      clauseId: "4",
      heading: "Objectives of Tax Incentives",
      headingAmharic: "የታክስ ማበረታቻዎች አላማዎች",
      content: "Tax incentives under this Regulation shall have the following objectives: a) Manufacturing investment; b) Export trade; c) Technology transfer; d) Job creation; e) Environmental protection; f) Efficient development of natural resources; g) Regional development promotion.",
      contentAmharic: "በዚህ ደንብ በተደነገገው መሰረት የሚፈቀዱ የታክስ ማበረታቻዎች፤ ሀ/ አምራች ኢንቨስትመንትን፤ ለ/ የወጪ ንግድን፤ ሐ/ የቴክኖሎጂ ዝውውርን፤ መ/ የስራ ፈጠራን፤ ሠ/ የከባቢ አየር ደህንነት ጥበቃን፤ ረ/ የሀገሪቱ የተፈጥሮ ሀብት በውጤታማ እና በብቃት መልማትን፤ እና ሰ/ የክልሎችን እድገት የማበረታታት አላማ ይኖራቸዋል።",
      sectionType: "eligibility",
      isVerified: true,
    },
    {
      id: "clause-5",
      clauseId: "5",
      heading: "Principles of Investment Incentives",
      headingAmharic: "የኢንቨስትመንት ማበረታቻ መርሆዎች",
      content: "Investment incentives shall comply with: 1) Legality, clarity, and time-boundedness; 2) Government fiscal capacity; 3) Written, transparent, non-discriminatory criteria; 4) Results monitoring; 5) Revocation and accountability for violations.",
      contentAmharic: "ኢንቨስትመንትን ለማበረታታት የሚሰጥ የታክስ ማበረታቻ የሚከተሉትን መርሆዎች በአንድነት የተከተለ መሆን አለበት፦ 1) በህግ ላይ የተመሰረተ፤ ግልጽ፤ በጊዜ የተገደበ፤ 2) የመንግስትን የፋይናንስ አቅም መሰረት ያደረገ፤ 3) በጽሁፍ ይፋ በተደረገ መስፈርት መሰረት አድልዎ በሌለበት ሁኔታ የሚሰጥ፤ 4) የታቀደውን ውጤት ያስገኘ መሆኑ ክትትል የሚደረግበት፤ እና 5) ህግ ተጥሶ በሚገኝበት ጊዜ የሚሰረዝ ና ተጠያቂነትን የሚያስከትል ፡፡",
      sectionType: "eligibility",
      isVerified: true,
    },
    {
      id: "clause-6",
      clauseId: "6",
      heading: "Permitted Incentives",
      headingAmharic: "የተፈቀዱ ማበረታቻዎች",
      content: "The following types of incentives may be granted: 1) Investment capital expenditure allowance; 2) Reduced income tax rate from standard; 3) Exemption from minimum alternative tax; 4) Exemption from dividend tax; 5) Exemption from capital gains tax; 6) Deduction from income tax payable; 7) Customs duty and tax incentive.",
      contentAmharic: "በዚህ ደንብ በተደነገገው መሰረት የሚከተሉት የማበረታቻ አይነቶች እንደሁኔታው ለፈቀዱ ይችላሉ፦ 1) የኢንቨስትመንት የካፒታል ወጪ ተቀናሽ (አላዋንስ)፣ 2) ከመደበኛው የማስከፈያ መጣኔ ዝቅ ያለ የገቢ ግብር፤ 3) ከአማራጭ አነስተኛ ግብር ነፃ የመሆን፣ 4) በዲቪደንድ ላይ ከሚከፈል ነፃ የመሆን፤ 5) ከካፒታል ዋጋ ዕድገት ግብር ላይ ነፃ የመሆን፤ 6) ሊከፈል ከሚገባ የገቢ ግብር ላይ ተቀናሽ የማግኘት፤ እና 7) የጉምሩክ ቀረጥ እና ታክስ ማበረታቻ ፡፡",
      sectionType: "incentive",
      isVerified: true,
    },
    {
      id: "clause-16",
      clauseId: "16",
      heading: "Customs Duty and Tax Incentive",
      headingAmharic: "የጉምሩክ ቀረጥ እና ታክስ ማበረታቻ",
      content: "Customs duty and tax incentive means the system by which the investor imports capital goods, construction materials, and vehicles necessary for the investment duty-free or at reduced rates as determined by the Ministry's directive.",
      contentAmharic: '"የጉምሩክ ቀረጥ እና ታክስ ማበረታቻ" ማለት ባለሀብቱ ለኢንቨስትመንቱ አስፈላጊ የሆኑትን የካፒታል ዕቃዎች፣ የግንባታ ዕቃዎች እና ተሽከርካሪዎችን ሚኒስቴሩ በሚያወጣው መመሪያ በሚወስነው መሰረት ከቀረጥና ታክስ ነፃ በመሆን ወይም በአነስተኛ መጣኔ የቀረጥና ታክስ በመክፈል ወደ አገር የሚያስገባበት ሥርዓት ነው፡፡',
      sectionType: "incentive",
      isVerified: true,
    },
  ],
};

// Capital Goods Annex (Directive 1064)
export const capitalGoodsAnnex: PolicyDocument = {
  id: "policy-1064-annex",
  name: "Capital Goods List - Investment Incentive Annexes",
  nameAmharic: "የካፒታል እቃዎች ዝርዝር",
  directiveNumber: "1064/2025",
  version: "1.0",
  effectiveDate: "2025-01-01",
  documentType: "annex",
  clauses: [
    {
      id: "annex-intro",
      clauseId: "Annex 2",
      heading: "Lists of Capital Goods",
      headingAmharic: "የካፒታል እቃዎች ዝርዝር",
      content: "This annex lists eligible capital goods with their HS codes for customs duty and tax incentive purposes under the Investment Incentives Regulation.",
      contentAmharic: "ይህ አባሪ በኢንቨስትመንት ማበረታቻ ደንብ መሰረት ለጉምሩክ ቀረጥ እና ታክስ ማበረታቻ ዓላማ የሚቀርቡ የካፒታል እቃዎችን ከHS ኮዶቻቸው ጋር ይዘረዝራል።",
      sectionType: "eligibility",
      isVerified: true,
    },
  ],
  capitalGoods: [
    // Manufacturing - Food Industry - Meat Processing
    { hsCode: "8438.5", description: "Meat Slicing Machines", descriptionAmharic: "የስጋ መቆራረጫ ወይም መመተሪያ ማሽኖች", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8438.5", description: "Meat Grinder Machines", descriptionAmharic: "የስጋ መፍጫ ማሽኖች", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8438.5", description: "Sausage Filling Machines", descriptionAmharic: "የሶሴጅ ማዘጋጃ ማሽኖች", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8438.1", description: "Meat Tenderizing Machines", descriptionAmharic: "የስጋ ማሳሻ ማሽኖች", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8422.2", description: "Vacuum Packaging Machines", descriptionAmharic: "የስጋ ማሸጊያ ማሽኖች", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8419.89", description: "Smokehouses", descriptionAmharic: "ስጋን በጭስ ለማድረቅ የሚያገለግል መሳሪያ ወይም ቤት", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8438.1", description: "Meat Cookers and Roasters", descriptionAmharic: "የስጋ ማብሰያ እና መጥበሻ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8418.99", description: "Freezing Equipment", descriptionAmharic: "የስጋ ማቀዝቀዣ ማሽን", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    { hsCode: "8438.1", description: "Canning Equipment", descriptionAmharic: "የጣሳ ማሸጊያ ማሽን", category: "Manufacturing", subcategory: "Food Industry - Meat Processing" },
    
    // Fish Processing
    { hsCode: "8438.1", description: "Fish Filleting Machines", descriptionAmharic: "የአሣ ፌሌቶ ማዘጋጃ ማሽኖች", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    { hsCode: "8438.2", description: "Fish Grinders", descriptionAmharic: "የዓሳ ስጋ መፍጫ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    { hsCode: "8438.1", description: "Fish Skinning Machines", descriptionAmharic: "የዓሳ ቆዳ መግፈፊያ ማሽን", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    { hsCode: "8418.99", description: "Freezing Equipment for Fish", descriptionAmharic: "የዓሳ ስጋ ማቀዝቀዣ ማሽን", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    { hsCode: "8419.89", description: "Fish Smoking Chambers", descriptionAmharic: "የዓሳ ስጋ በጭስ ለማድረቅ የሚያገለግል መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    { hsCode: "8438.1", description: "Fish Canning Machines", descriptionAmharic: "የዓሳ ስጋ በጣሳ ማሸጊያ ማሽን", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    { hsCode: "8419.39", description: "Fish Drying Machines", descriptionAmharic: "የዓሳ ስጋ ማድረቂያ ማሽን", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    { hsCode: "8438.2", description: "Fish Paste Making Machines", descriptionAmharic: "የአሳ ቅባቶች ማዘጋጃ ማሽኖች", category: "Manufacturing", subcategory: "Food Industry - Fish Processing" },
    
    // Fruits and Vegetables Processing
    { hsCode: "8437.1", description: "Fruit and Vegetable Washers", descriptionAmharic: "የፍራፍሬ እና የአትክልት ማጠቢያ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    { hsCode: "8437.1", description: "Fruit and Vegetable Peelers", descriptionAmharic: "የአትክልትና ፍራፍሬ መላጫ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    { hsCode: "8437.1", description: "Fruit and Vegetable Slicers", descriptionAmharic: "ፍራፍሬ እና አትክልት መቁረጫ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    { hsCode: "8438.1", description: "Canning Machines (Fruit and Vegetables)", descriptionAmharic: "ፍራፍሬ እና አትክልት በጣሳዎች ማሸጊያ ማሽን", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    { hsCode: "8418.99", description: "Freezing Equipment for Fruits and Veggies", descriptionAmharic: "ፍራፍሬ እና አትክልት ማቀዝቀዣ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    { hsCode: "8437.1", description: "Juicing Machines", descriptionAmharic: "ፍራፍሬ እና አትክልት መጭመቂያ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    { hsCode: "8419.39", description: "Drying Equipment for Fruits and Vegetables", descriptionAmharic: "ፍራፍሬ እና አትክልት ማድረቂያ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    { hsCode: "8419.89", description: "Pasteurization Equipment", descriptionAmharic: "ፍራፍሬ እና አትክልት ፓስቸራይዝ ማድረጊያ መሳሪያ", category: "Manufacturing", subcategory: "Food Industry - Fruits and Vegetables" },
    
    // Edible Oil Manufacturing
    { hsCode: "8479.89", description: "Oil Expellers", descriptionAmharic: "የዘይት ማውጫ ማሸን", category: "Manufacturing", subcategory: "Edible Oil" },
  ],
};

// Export all policy documents
export const policyDocuments: PolicyDocument[] = [
  investmentIncentivesRegulation,
  capitalGoodsAnnex,
];

// Helper function to find capital goods by HS code
export function findCapitalGoodByHSCode(hsCode: string): CapitalGood | undefined {
  return capitalGoodsAnnex.capitalGoods?.find(good => good.hsCode === hsCode);
}

// Helper function to search capital goods
export function searchCapitalGoods(query: string): CapitalGood[] {
  const lowerQuery = query.toLowerCase();
  return capitalGoodsAnnex.capitalGoods?.filter(good => 
    good.description.toLowerCase().includes(lowerQuery) ||
    good.descriptionAmharic.includes(query) ||
    good.hsCode.includes(query)
  ) || [];
}

// Helper function to get all unique categories
export function getCapitalGoodCategories(): string[] {
  const categories = new Set(capitalGoodsAnnex.capitalGoods?.map(g => g.category) || []);
  return Array.from(categories);
}
