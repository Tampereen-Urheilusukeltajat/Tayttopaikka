import { compareDesc } from 'date-fns';
import { useMemo, type JSX } from 'react';
import { eurCentsToEur, computeOpenBalance } from '@tayttopaikka/pricing';
import { type FillEvent } from '../../interfaces/FillEvent';
import { usePaymentEventsQuery } from '../../lib/queries/paymentEventsQuery';
import { getUserIdFromAccessToken } from '../../lib/utils';

type FillEventStatsProps = {
  fillEvents: FillEvent[];
};

export const FillEventStats = ({ fillEvents }: FillEventStatsProps): JSX.Element => {
  const userId = useMemo(() => getUserIdFromAccessToken(), []);
  const { data: paymentEvents } = usePaymentEventsQuery(userId);

  const totalCost = fillEvents.reduce((sum, fe) => sum + fe.price, 0);

  const lastCompleted = paymentEvents
    ?.filter((pe) => pe.status === 'COMPLETED')
    .sort((a, b) => compareDesc(new Date(a.createdAt), new Date(b.createdAt)))[0];

  const openBalance = computeOpenBalance(fillEvents, lastCompleted?.createdAt);

  return (
    <div className="row g-3 pb-4">
      <div className="col-md-4">
        <div className="card h-100">
          <div className="card-body">
            <h6 className="card-subtitle mb-2 text-muted">Täyttöjä yhteensä</h6>
            <p className="card-text fs-3 fw-bold">{fillEvents.length}</p>
          </div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="card h-100">
          <div className="card-body">
            <h6 className="card-subtitle mb-2 text-muted">
              Kustannukset yhteensä
            </h6>
            <p className="card-text fs-3 fw-bold">{eurCentsToEur(totalCost)} €</p>
          </div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="card h-100">
          <div className="card-body">
            <h6 className="card-subtitle mb-2 text-muted">Avoin saldo</h6>
            <p className="card-text fs-3 fw-bold">
              {eurCentsToEur(openBalance)} €
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
