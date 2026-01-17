# Plan: Make Document Analysis Results Consistent

## Problem
Running the same analysis multiple times with identical documents produces different results due to AI model non-determinism.

## Root Cause
- `temperature: 0.1` introduces randomness in token selection
- No caching mechanism to avoid redundant AI calls
- No seed parameter for reproducibility

---

## Solution: Two-Part Fix

### Part 1: Make AI Calls Deterministic (Quick Fix)

**File:** `supabase/functions/analyze-documents/index.ts`

Change the API call parameters:
```typescript
const body: any = {
  model: "google/gemini-2.5-pro",
  messages: [...],
  temperature: 0,  // Changed from 0.1 to 0 for deterministic output
  max_tokens: 32000,
  // ... rest of config
};
```

This ensures the model always picks the highest-probability token, eliminating randomness.

---

### Part 2: Add Result Caching (Recommended)

Create a caching layer that stores analysis results keyed by a hash of the input documents. This provides:
- Instant results for repeated analyses
- Cost savings (no redundant AI calls)
- Guaranteed identical results for identical inputs

**Implementation Steps:**

1. **Create database table for analysis cache:**
```sql
CREATE TABLE analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_hash TEXT UNIQUE NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_analysis_cache_hash ON analysis_cache(document_hash);
CREATE INDEX idx_analysis_cache_expires ON analysis_cache(expires_at);
```

2. **Update edge function to check cache first:**
   - Generate a hash from: license text + invoice text + policy document contents
   - Before calling AI, check if hash exists in cache
   - If found and not expired, return cached result immediately
   - If not found, proceed with AI analysis, then store result

3. **Add cache invalidation:**
   - When policy documents are updated, clear related cache entries
   - Set reasonable TTL (e.g., 7 days) for automatic cleanup

---

## Expected Outcome
- Running analysis with identical documents will always return the same result
- Subsequent analyses of the same documents will be instant (cached)
- Policy document updates will trigger fresh analysis

---

## Implementation Order
1. First: Set `temperature: 0` (immediate fix, low risk)
2. Second: Add caching layer (more robust long-term solution)
