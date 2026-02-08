import React, { useMemo, useState, useCallback } from 'react';
import {
  useArchivedUsersQuery,
  useUnarchiveUserMutation,
} from '../../lib/queries/archivedUserQuery';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { CommonTableV2 } from '../../components/common/Table/CommonTable-v2';
import { type ArchivedUser } from '../../interfaces/ArchivedUser';
import { Button } from 'react-bootstrap';
import { PageLoadingSpinner } from '../../components/Spinner';

const columnHelper = createColumnHelper<ArchivedUser>();

export const ArchivedUsersPage: React.FC = () => {
  const { data, isLoading } = useArchivedUsersQuery();
  const { mutate: unarchiveUser, isPending } = useUnarchiveUserMutation();
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingUnarchive, setConfirmingUnarchive] = useState<string | null>(
    null,
  );

  const userData = useMemo(() => data ?? [], [data]);

  const filteredUserData = useMemo(() => {
    if (!searchQuery.trim()) {
      return userData;
    }

    const query = searchQuery.toLowerCase();
    return userData.filter((user) => {
      const fullName =
        `${user.surname ?? ''} ${user.forename ?? ''}`.toLowerCase();
      const email = user.email?.toLowerCase() ?? '';

      return fullName.includes(query) || email.includes(query);
    });
  }, [userData, searchQuery]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fi-FI');
  };

  const handleUnarchive = useCallback(
    (userId: string): void => {
      if (confirmingUnarchive === userId) {
        unarchiveUser(userId);
        setConfirmingUnarchive(null);
      } else {
        setConfirmingUnarchive(userId);
        setTimeout(() => {
          setConfirmingUnarchive(null);
        }, 3000);
      }
    },
    [confirmingUnarchive, unarchiveUser],
  );

  const userColumns = useMemo(
    () => [
      columnHelper.accessor('id', {
        id: 'id',
      }),
      columnHelper.accessor(
        (row) => `${row.surname ?? ''}, ${row.forename ?? ''}`,
        {
          id: 'fullName',
          header: 'Nimi',
          cell: (user) => user.getValue() || 'N/A',
        },
      ),
      columnHelper.accessor('email', {
        header: 'Sähköposti',
        cell: (user) => user.getValue() ?? 'N/A',
      }),
      columnHelper.accessor('lastLogin', {
        header: 'Viimeisin kirjautuminen',
        cell: (cell) => formatDate(cell.getValue()),
      }),
      columnHelper.accessor('archivedAt', {
        header: 'Arkistoitu',
        cell: (cell) => formatDate(cell.getValue()),
      }),
      columnHelper.accessor('monthsInactive', {
        header: 'Kuukausia inaktiivinen',
        cell: (cell) => cell.getValue(),
      }),
      columnHelper.accessor('unpaidInvoicesCount', {
        header: 'Maksamattomia laskuja',
        cell: (cell) => {
          const count = cell.getValue();
          return (
            <span style={{ color: count > 0 ? 'red' : 'inherit' }}>
              {count}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Toiminnot',
        cell: (cell) => {
          const userId = cell.row.getValue('id') as string;
          const isConfirming = confirmingUnarchive === userId;

          return (
            <Button
              variant={isConfirming ? 'danger' : 'primary'}
              size="sm"
              onClick={() => {
                handleUnarchive(userId);
              }}
              disabled={isPending}
            >
              {isConfirming ? 'Vahvista' : 'Palauta'}
            </Button>
          );
        },
      }),
    ],
    [confirmingUnarchive, isPending, handleUnarchive],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: userColumns,
    data: filteredUserData,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      columnVisibility: {
        id: false,
      },
    },
  });

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="container mt-4">
      <h1>Arkistoidut käyttäjät</h1>
      <p className="text-muted">
        Tässä näkymässä näet käyttäjät, jotka on arkistoitu automaattisesti 36
        kuukauden inaktiivisuuden jälkeen. Voit palauttaa käyttäjän arkistosta,
        jos he ottavat yhteyttä ja haluavat jatkaa käyttöä.
      </p>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Hae nimellä tai sähköpostilla..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
        />
      </div>
      {filteredUserData.length === 0 ? (
        <p>Ei arkistoituja käyttäjiä.</p>
      ) : (
        <CommonTableV2 table={table} />
      )}
    </div>
  );
};
