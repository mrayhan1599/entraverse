# manual-daily-average

Edge Function to compute 30-day average daily sales from the latest manual warehouse movement upload and push the value into matching product variants (and inventory) in Supabase.

## How it works
1. Fetches the newest row in `warehouse_movements` where `source = 'manual'`.
2. Normalizes SKUs (removing spaces, lowercasing) and sums `qty_out`/`qtyOut`/`qty`/`quantity` per SKU.
3. Divides the totals by 30 to get an average daily sales figure per SKU (rounded to 2 decimals in the payload).
4. Updates `products.variant_pricing[].dailyAverageSales` and `products.inventory.dailyAverageSales` when they differ from the computed value.

## Deployment
1. Make sure the table and columns above exist.
2. Set required env vars in your Supabase project:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy the function:

   ```bash
   supabase functions deploy manual-daily-average
   ```

4. (Optional) Schedule a daily run via Supabase Scheduler so the averages stay fresh without manual triggers:

   ```bash
   supabase functions schedule create manual-daily-average --schedule "0 2 * * *" --url "/manual-daily-average"
   ```

5. You can also invoke manually for testing:

   ```bash
   supabase functions invoke manual-daily-average --project-ref <your-project-ref>
   ```

When invoked (by schedule or manually), the function updates product records with the latest 30-day average daily sales figures derived from manual uploads.
