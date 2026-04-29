import React, { useCallback, useMemo } from 'react';
import { Badge } from 'react-bootstrap';
import { format } from 'date-fns';
import { BsChevronDown, BsChevronRight, BsTrash } from 'react-icons/bs';
import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useAllGasPricesQuery, type GasWithPricing } from '../../lib/queries/gasQuery';
import { formatEurCentsToEur, mapGasToName } from '../../lib/utils';
import { PrimaryButton, ElementButton } from '../../components/common/Button/Buttons';
import { Modal } from '../../components/common/Modal/Modal';
import { CommonTableV2 } from '../../components/common/Table/CommonTable-v2';
import styles from '../../components/common/Table/CommonTable.module.scss';
import { GasPriceModal } from './GasPriceModal';
import { useDeleteGasPriceMutation } from '../../lib/queries/gasMutations';
import { useState } from 'react';

type PriceRow = GasWithPricing & {
  subRows?: PriceRow[];
};

const buildTableRows = (prices: GasWithPricing[]): PriceRow[] => {
  const now = new Date();

  const isFuture = (p: GasWithPricing): boolean => new Date(p.activeFrom) > now;
  const isPast = (p: GasWithPricing): boolean =>
    p.activeTo !== undefined && new Date(p.activeTo) <= now;
  const isCurrent = (p: GasWithPricing): boolean => !isFuture(p) && !isPast(p);

  const byGas = prices.reduce<Map<number, GasWithPricing[]>>((acc, price) => {
    acc.set(price.gasId, [...(acc.get(price.gasId) ?? []), price]);
    return acc;
  }, new Map());

  return Array.from(byGas.values()).flatMap((group) => {
    const current = group.find(isCurrent);
    if (!current) return [];
    // Diluent pricing is calculated when users input the current oxygen and helium percentages
    // at the filling event
    if (current.gasName === 'Diluent') return [];

    const future = group.find(isFuture); // at most one per spec
    const past = group.filter(isPast);
    const subRows = [...(future ? [future] : []), ...past];

    return [{ ...current, subRows: subRows.length > 0 ? subRows : undefined }];
  });
};

const formatDate = (iso: string): string => format(new Date(iso), 'dd.MM.yyyy');
const formatPrice = (cents: number): string => `${formatEurCentsToEur(cents)} €`;
const formatActiveTo = (iso: string | undefined): string => {
  if (!iso || iso.startsWith('9999')) return 'Toistaiseksi';
  return formatDate(iso);
};

const columnHelper = createColumnHelper<PriceRow>();

export const GasPrices: React.FC = () => {
  const { data: prices, isLoading } = useAllGasPricesQuery();
  const [editingGas, setEditingGas] = useState<GasWithPricing | null>(null);
  const [deletingPrice, setDeletingPrice] = useState<GasWithPricing | null>(null);

  const handleCloseModal = useCallback(() => setEditingGas(null), []);
  const handleCloseDeleteModal = useCallback(() => setDeletingPrice(null), []);

  const { mutate: doDelete, isPending: isDeleting } =
    useDeleteGasPriceMutation(handleCloseDeleteModal);

  const tableData = useMemo(() => buildTableRows(prices ?? []), [prices]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('gasName', {
        header: 'Kaasu',
        cell: (info) => {
          const row = info.row;
          if (row.depth !== 0) return null;
          const Icon = row.getIsExpanded() ? BsChevronDown : BsChevronRight;
          return (
            <span
              role="button"
              onClick={row.getToggleExpandedHandler()}
              className="d-flex align-items-center gap-2 user-select-none"
            >
              {row.getCanExpand() && <Icon size={12} />}
              <strong>{mapGasToName(info.getValue())}</strong>
            </span>
          );
        },
      }),
      columnHelper.accessor('priceEurCents', {
        header: 'Hinta (€/l)',
        cell: (info) => formatPrice(info.getValue()),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Tila',
        cell: (info) => {
          const row = info.row;
          const now = new Date();
          const activeFrom = new Date(row.original.activeFrom);
          const activeTo = row.original.activeTo
            ? new Date(row.original.activeTo)
            : null;

          if (row.depth === 0) return <Badge bg="success">Voimassa</Badge>;
          if (activeFrom > now) return <Badge bg="info" text="dark">Tuleva</Badge>;
          if (activeTo !== null && activeTo <= now) return <Badge bg="secondary">Päättynyt</Badge>;
          return null;
        },
      }),
      columnHelper.accessor('activeFrom', {
        header: 'Voimassa alkaen',
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('activeTo', {
        header: 'Voimassa asti',
        cell: (info) => formatActiveTo(info.getValue()),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const row = info.row;
          const now = new Date();

          // Future sub-row: show trash icon
          if (row.depth !== 0) {
            if (new Date(row.original.activeFrom) > now) {
              return (
                <ElementButton
                  element={<BsTrash className={styles.delete} />}
                  tooltip="Poista tuleva hinta"
                  className="w-2"
                  onClick={() => setDeletingPrice(row.original)}
                />
              );
            }
            return null;
          }

          // Parent row: disable edit if a future price already exists or gas is Air
          const isAir = row.original.gasName === 'Air';
          const hasFuture = row.subRows?.some(
            (sub) => new Date(sub.original.activeFrom) > now,
          );
          if (isAir) return null;
          return (
            <PrimaryButton
              text="Muokkaa hintaa"
              disabled={hasFuture}
              onClick={() => setEditingGas(row.original)}
            />
          );
        },
      }),
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not React Compiler-compatible; memoization is handled manually above
  const table = useReactTable<PriceRow>({
    data: tableData,
    columns,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: { expanded: true },
  });

  if (isLoading) return null;

  return (
    <div>
      <h2>Kaasujen hinnat</h2>
      <p className="text-muted">
        Taulukossa näkyy kaikkien kaasujen voimassaolevat hinnat sekä
        hinnaston historia. Hinta on eurosenteissä per litra kaasua (vaihteluväli 0–99,999 €/l, enintään 3 desimaalia).
        Uusi hinta tulee voimaan valittuna päivänä UTC-keskiyöllä (klo 02:00–03:00
        Suomen aikaa vuodenajasta riippuen). Kullekin
        kaasulle voi olla kerrallaan korkeintaan yksi tuleva hinta — poista se
        ensin jos haluat asettaa uuden.
      </p>
      <CommonTableV2 table={table} />

      {editingGas !== null && (
        <GasPriceModal gas={editingGas} onClose={handleCloseModal} />
      )}

      {deletingPrice !== null && (
        <Modal
          isOpen
          title="Poista tuleva hinta"
          confirmButtonText={isDeleting ? 'Poistetaan...' : 'Poista'}
          onConfirm={() => doDelete(String(deletingPrice.gasPriceId))}
          onClose={handleCloseDeleteModal}
        >
          <p>
            Olet poistamassa tulevan hinnan{' '}
            <strong>{formatPrice(deletingPrice.priceEurCents)}</strong>, joka
            olisi tullut voimaan{' '}
            <strong>{formatDate(deletingPrice.activeFrom)}</strong>.
          </p>
          <p>Nykyinen hinta jatkuu toistaiseksi.</p>
        </Modal>
      )}
    </div>
  );
};
