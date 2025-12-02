# manual-daily-average

Edge Function to compute half-month average daily sales from the latest manual warehouse movement uploads and push the period-specific values into matching product variants (and inventory) in Supabase.

## How it works
1. Fetches the newest rows in `warehouse_movements` where `source = 'manual'` for each period signature:
   - Periode A: `manual-period-1`
   - Periode B: `manual-period-2`
2. Normalizes SKUs (removing spaces, lowercasing) and sums `qty_out`/`qtyOut`/`qty`/`quantity` per SKU for each period.
3. Divides Periode A totals by the number of days elapsed in the current month up to the 15th (or 15 days when today is past the 15th).
4. Divides Periode B totals by the days in the active second-half window:
   - If today is between the 1st–15th, use the previous month's 16–end-of-month day count.
   - If today is the 16th or later, use the current month's days elapsed since the 16th.
5. Updates `products.variant_pricing[].dailyAverageSalesPeriodA` / `dailyAverageSalesPeriodB` and `products.inventory.dailyAverageSalesPeriodA` / `dailyAverageSalesPeriodB` when they differ from the computed values.

## Deployment
1. Make sure the table and columns above exist.
2. Set required env vars in your Supabase project:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy the function:

   ```bash
   supabase functions deploy manual-daily-average
   ```

4. (Optional) Schedule a daily run (e.g., 00:01 WIB) via Supabase Scheduler so the averages stay fresh without manual triggers:

   ```bash
   supabase functions schedule create manual-daily-average --schedule "0 2 * * *" --url "/manual-daily-average"
   ```

5. You can also invoke manually for testing:

   ```bash
   supabase functions invoke manual-daily-average --project-ref <your-project-ref>
   ```

When invoked (by schedule or manually), the function updates product records with the latest Periode A/B daily sales averages derived from manual uploads.
