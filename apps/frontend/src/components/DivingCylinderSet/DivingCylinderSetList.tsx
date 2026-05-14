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
import { ModifyDivingCylinderSetModal } from './ModifyDivingCylinderSetModal';
import {
  buildCylinderTableColumns,
  buildCylinderTableRows,
} from '../CylinderSet/CylinderSetTable';

type DivingCylinderSetListProps = {
  cylinderSets: DivingCylinderSet[];
  onArchive: (id: string) => void;
  onPatch: (args: { divingCylinderSetId: string; payload: { name?: string; cylinders?: Array<{ id: string; inspection?: string }> } }) => void;
  userId: string;
};

export const DivingCylinderSetList = ({
  cylinderSets,
  onArchive,
  onPatch,
  userId,
}: DivingCylinderSetListProps): JSX.Element => {

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [toBeArchivedDivingCylinderSetId, setToBeArchivedDivingCylinderSetId] =
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
          setToBeArchivedDivingCylinderSetId(id);
          setConfirmModalOpen(true);
        },
      }),
    [cylinderSets],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const DivingCylinderTable = useReactTable({
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
    if (!toBeArchivedDivingCylinderSetId) {
      return toast.error(
        'Jotain meni pieleen. Lataa sivu uudelleen ja yritä uudestaan',
      );
    }
    onArchive(toBeArchivedDivingCylinderSetId);
    setToBeArchivedDivingCylinderSetId(undefined);
    setConfirmModalOpen(false);
  }, [onArchive, toBeArchivedDivingCylinderSetId]);

  return (
    <div>
      <h1 className="pb-4">Omat pullot</h1>
      <div>
        <CommonTableV2 table={DivingCylinderTable} />
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
        <ModifyDivingCylinderSetModal
          closeModal={() => {
            setShowModifyModal(false);
            setModifiedCylinderSet(undefined);
          }}
          showModifyDivingCylinderModal={showModifyModal}
          divingCylinderSet={modifiedCylinderSet}
          onPatch={onPatch}
          userId={userId}
        />
      )}
    </div>
  );
};
