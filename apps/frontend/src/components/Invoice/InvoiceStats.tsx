import { useMemo, type JSX } from 'react';
import { format } from 'date-fns';
import { eurCentsToEur } from '@tayttopaikka/pricing';
import {
  type Invoice,
  type GasBreakdownRow,
} from '../../lib/queries/invoiceQuery';
import { AvailableGasses, mapGasToName } from '../../lib/utils';
import styles from './InvoiceStats.module.scss';

type InvoiceStatsProps = {
  invoices: Invoice[];
  gasBreakdown: GasBreakdownRow[];
};

export const InvoiceStats = ({
  invoices,
  gasBreakdown,
}: InvoiceStatsProps): JSX.Element => {
  const totalDueEurCents = useMemo(
    () => invoices.reduce((sum, invoice) => sum + invoice.invoiceTotal, 0),
    [invoices],
  );

  const unpaidFillEventCount = useMemo(
    () =>
      invoices.reduce((sum, invoice) => sum + invoice.invoiceRows.length, 0),
    [invoices],
  );

  const largestBalanceInvoice = useMemo(
    () =>
      invoices.reduce<Invoice | null>(
        (largest, invoice) =>
          !largest || invoice.invoiceTotal > largest.invoiceTotal
            ? invoice
            : largest,
        null,
      ),
    [invoices],
  );

  const oldestUnpaidFillDate = useMemo(() => {
    const dates = invoices.flatMap((invoice) =>
      invoice.invoiceRows.map((row) => row.date),
    );

    return dates.length > 0
      ? dates.reduce((oldest, date) => (date < oldest ? date : oldest))
      : null;
  }, [invoices]);

  return (
    <div className="pb-4">
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">
                Saatavat yhteensä
              </h6>
              <p className="card-text fs-3 fw-bold">
                {eurCentsToEur(totalDueEurCents)} €
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">
                Laskuja yhteensä
              </h6>
              <p className="card-text fs-3 fw-bold">{invoices.length}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">
                Täyttöjä yhteensä
              </h6>
              <p className="card-text fs-3 fw-bold">{unpaidFillEventCount}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">
                Suurin yksittäinen saldo
              </h6>
              <p className="card-text fs-3 fw-bold mb-1">
                {eurCentsToEur(largestBalanceInvoice?.invoiceTotal ?? 0)} €
              </p>
              <p className="card-text text-muted small mb-0">
                {largestBalanceInvoice
                  ? `${largestBalanceInvoice.user.surname}, ${largestBalanceInvoice.user.forename}`
                  : 'Ei avoimia saldoja'}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">
                Vanhin maksamaton täyttö
              </h6>
              <p className="card-text fs-3 fw-bold">
                {oldestUnpaidFillDate
                  ? format(new Date(oldestUnpaidFillDate), 'dd.MM.yyyy')
                  : '–'}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">
                Saatavat kaasuittain
              </h6>
              {gasBreakdown.length > 0 ? (
                gasBreakdown.map((row) => (
                  <div key={row.gasId} className={styles.priceRow}>
                    <span>{mapGasToName(row.gasName as AvailableGasses)}:</span>
                    <span>{eurCentsToEur(row.priceEurCents)} €</span>
                  </div>
                ))
              ) : (
                <p className="card-text text-muted small mb-0">
                  Ei avoimia saldoja
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
