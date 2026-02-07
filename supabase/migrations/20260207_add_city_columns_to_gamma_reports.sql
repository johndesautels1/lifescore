-- ============================================================================
-- Add city1 and city2 columns to gamma_reports table
-- Session 19 Fix: Enable cross-device sync with city names
-- ============================================================================

-- Add city1 and city2 columns
ALTER TABLE public.gamma_reports
ADD COLUMN IF NOT EXISTS city1 TEXT,
ADD COLUMN IF NOT EXISTS city2 TEXT;

-- Add index for faster lookups by city
CREATE INDEX IF NOT EXISTS idx_gamma_reports_cities
ON public.gamma_reports(city1, city2);

-- Comment for documentation
COMMENT ON COLUMN public.gamma_reports.city1 IS 'Name of first city in comparison (for cross-device sync)';
COMMENT ON COLUMN public.gamma_reports.city2 IS 'Name of second city in comparison (for cross-device sync)';
