import { compareDesc, format } from 'date-fns';
import { useFillEventQuery } from '../../lib/queries/FillEventQuery';
import { CommonTableV2 } from '../common/Table/CommonTable-v2';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, type JSX } from 'react';
import { eurCentsToEur } from '@tayttopaikka/pricing';
import { FillEventStats } from './FillEventStats';
import { type FillEvent } from '../../interfaces/FillEvent';

const columnHelper = createColumnHelper<FillEvent>();

const columns = [
  columnHelper.accessor('createdAt', {
    header: 'Päivämäärä',
    cell: (info) => format(new Date(info.getValue()), 'dd.MM.yy HH:mm'),
  }),
  columnHelper.accessor('cylinderSetName', { header: 'Pullosetti' }),
  columnHelper.accessor('gasMixture', { header: 'Kaasuseos' }),
  columnHelper.accessor('compressorName', {
    header: 'Kompressori',
    cell: (info) => info.getValue() ?? '',
  }),
  columnHelper.accessor('description', { header: 'Lisätiedot' }),
  columnHelper.accessor('price', {
    header: 'Hinta (€)',
    cell: (info) => `${eurCentsToEur(info.getValue())} €`,
  }),
];

export const ListFillEvents = (): JSX.Element => {
  const { data: fillEvents } = useFillEventQuery();
  const sortedFillEvents = useMemo(
    () =>
      fillEvents
        ?.slice()
        .sort((a, b) => compareDesc(a.createdAt, b.createdAt)) ?? [],
    [fillEvents],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not React Compiler-compatible; memoization is handled manually above
  const table = useReactTable({
    columns,
    data: sortedFillEvents,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <h1 className="pb-4">Täyttöhistoria</h1>
      <FillEventStats fillEvents={fillEvents ?? []} />
      <CommonTableV2 table={table} />
    </div>
  );
};
