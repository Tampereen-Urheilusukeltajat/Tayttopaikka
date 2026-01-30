# Database Seeds

This directory contains seed files for populating the database with initial development data.

## Running Seeds

To run all seed files in order:

```bash
cd apps/backend
pnpm db:seed
```

Or from the root of the monorepo:

```bash
pnpm --filter @tayttopaikka/backend db:seed
```

## Creating New Seed Files

To create a new seed file:

```bash
cd apps/backend
pnpm db:seed:make seed_name
```

## Current Seeds

### `01_development_data.ts`

Populates the database with initial development data:

#### Compressors (3 total)

- **Air Compressor 1**: Primary air-only compressor (enabled)
- **Air Compressor 2**: Secondary air-only compressor (enabled)
- **Nitrox/Trimix Compressor**: Mixed-gas compressor (enabled)

#### Gas Prices

Updates the existing gas prices to realistic values:

- Air: €0.00/L
- Helium: €0.06/L
- Oxygen: €0.006/L
- Argon: €0.015/L
- Diluent: €0.021/L

#### Storage Cylinders (8 total)

- 2x 50L Oxygen storage cylinders (200 bar)
- 4x 50L Helium storage cylinders (200 bar)
- 1x 40L Argon storage cylinder (200 bar)
- 1x 40L Diluent storage cylinder (200 bar)

## Notes

- Seeds are re-runnable: they will clear existing data for compressors and storage cylinders
- Gas prices are updated rather than deleted to preserve historical pricing data
- Seeds run in alphabetical order by filename (hence the `01_` prefix)
