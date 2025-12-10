# next-procurement-calc

Edge Function to refresh `variant_pricing[].nextProcurement` using the spreadsheet rule provided by the merchandising team.

Formula (using spreadsheet column references):

```
=IF(
  OR($AI2="", TODAY() - $AI2 < 30),
  $AJ2,
  IF(
    (N2 + O2) <= L2,
    M2,
    MAX(
      M2 - (N2 + O2 - L2),
      0
    )
  )
)
```

Mappings to stored fields:

- **AI** → `startDate` / `start_date` (variant registration date)
- **AJ** → `initialStockPrediction` / `initial_stock_prediction`
- **N** → `stock` / `current_stock`
- **O** → `inTransitStock` / `in_transit_stock`
- **L** → `reorderPoint` / `reorder_point`
- **M** → `fifteenDayRequirement` / `fifteen_day_requirement`

The function walks every product, recalculates the next procurement value per variant, and only updates rows whose computed result differs from what is currently stored.

## Deployment

1. Set the required environment variables in your Supabase project:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Deploy the function:

   ```bash
   supabase functions deploy next-procurement-calc
   ```

3. (Recommended) Schedule a daily refresh via Supabase Scheduler so the values stay current:

   ```bash
   supabase functions schedule create next-procurement-calc --schedule "0 1 * * *" --url "/next-procurement-calc"
   ```

4. You can also trigger it manually:

   ```bash
   supabase functions invoke next-procurement-calc --project-ref <your-project-ref>
   ```

On completion, the function returns the number of products scanned, variants updated, and how many product rows were written back.
