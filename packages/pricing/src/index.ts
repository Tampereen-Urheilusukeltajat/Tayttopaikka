/**
 * Convert euro cents to euros, rounded to 3 decimal places for display.
 */
export const eurCentsToEur = (cents: number): number =>
  parseFloat((cents / 100).toFixed(3));

/**
 * Volume consumed from a storage cylinder in litres.
 * The pressure difference is ceiled to guard against floating-point artefacts,
 * matching the server-side calculation exactly.
 */
export const calculateVolumeLitres = (
  cylinderVolume: number,
  startPressure: number,
  endPressure: number,
): number => Math.ceil(startPressure - endPressure) * cylinderVolume;

/**
 * Raw cost of a single regular gas fill in euro cents (not rounded).
 * Sum costs from multiple rows before rounding with calcTotalFillCostCents.
 */
export const calcGasFillCostCents = (
  volumeLitres: number,
  pricePerLitreCents: number,
): number => volumeLitres * pricePerLitreCents;

/**
 * Cost of a diluent fill in euro cents, rounded up to the nearest cent.
 * Formula: ceil((hePct / 100) * hePriceCents * volumeLitres)
 *
 * toFixed(10) strips floating-point noise (e.g. 0.4*6*100 = 240.00000000000003)
 * before ceiling, matching the result of MariaDB DECIMAL arithmetic.
 */
export const calcDiluentFillCostCents = (
  volumeLitres: number,
  hePct: number,
  hePriceCents: number,
): number => {
  const raw = (hePct / 100) * hePriceCents * volumeLitres;
  return Math.ceil(parseFloat(raw.toFixed(10)));
};

/**
 * Total fill cost in whole euro cents.
 * All individual costs are summed first, then ceiled once to minimise rounding errors.
 */
export const calcTotalFillCostCents = (
  gasCostsCents: number[],
  diluentCostsCents: number[],
): number =>
  Math.ceil(
    gasCostsCents.reduce((a, b) => a + b, 0) +
      diluentCostsCents.reduce((a, b) => a + b, 0),
  );
