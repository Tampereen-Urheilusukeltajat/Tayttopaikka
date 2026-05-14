import { CommonTableV2 } from '../common/Table/CommonTable-v2';
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState, type JSX } from 'react';
import { Modal } from '../common/Modal/Modal';
import { toast } from 'react-toastify';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';
import { ModifyClubCylinderSetModal } from './ModifyClubCylinderSetModal';
import {
  buildCylinderTableColumns,
  buildCylinderTableRows,
} from '../CylinderSet/CylinderSetTable';

type ClubCylinderSetListProps = {
  cylinderSets: DivingCylinderSet[];
  onArchive: (id: string) => void;
  onPatch: (args: { divingCylinderSetId: string; payload: { name?: string; cylinders?: Array<{ id: string; inspection?: string }> } }) => void;
};

export const ClubCylinderSetList = ({
  cylinderSets,
  onArchive,
  onPatch,
}: ClubCylinderSetListProps): JSX.Element => {

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [toBeArchivedClubCylinderSetId, setToBeArchivedClubCylinderSetId] =
    useState<string | undefined>(undefined);

  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifiedCylinderSet, setModifiedCylinderSet] = useState<
    DivingCylinderSet | undefined
  >(undefined);

  const tableCylinders = useMemo(
    () => buildCylinderTableRows(cylinderSets),
    [cylinderSets],
  );

  const tableColumns = useMemo(
    () =>
      buildCylinderTableColumns({
        onEdit: (id) => {
          setModifiedCylinderSet(cylinderSets.find((dcs) => dcs.id === id));
          setShowModifyModal(true);
        },
        onDelete: (id) => {
          setToBeArchivedClubCylinderSetId(id);
          setConfirmModalOpen(true);
        },
      }),
    [cylinderSets],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const ClubCylinderTable = useReactTable({
    columns: tableColumns,
    data: tableCylinders,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.cylinders,
    state: {
      columnVisibility: {
        id: false,
      },
      expanded: true,
    },
  });

  const handleArchiveConfirm = useCallback(() => {
    if (!toBeArchivedClubCylinderSetId) {
      return toast.error(
        'Jotain meni pieleen. Lataa sivu uudelleen ja yritä uudestaan',
      );
    }
    onArchive(toBeArchivedClubCylinderSetId);
    setToBeArchivedClubCylinderSetId(undefined);
    setConfirmModalOpen(false);
  }, [onArchive, toBeArchivedClubCylinderSetId]);

  return (
    <div>
      <h1 className="pb-4">Seuran pullot</h1>
      <div>
        <CommonTableV2 table={ClubCylinderTable} />
      </div>
      <Modal
        isOpen={confirmModalOpen}
        title="Poista pullosetti"
        onClose={() => {
          setConfirmModalOpen(false);
        }}
        onConfirm={handleArchiveConfirm}
      >
        Haluatko varmasti poistaa pullosetin? Tätä toimintoa ei voi peruuttaa.
      </Modal>
      {modifiedCylinderSet && (
        <ModifyClubCylinderSetModal
          closeModal={() => {
            setShowModifyModal(false);
            setModifiedCylinderSet(undefined);
          }}
          showModifyClubCylinderModal={showModifyModal}
          clubCylinderSet={modifiedCylinderSet}
          onPatch={onPatch}
        />
      )}
    </div>
  );
};
