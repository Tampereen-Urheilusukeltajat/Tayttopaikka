import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import { BsPencil, BsTrash } from 'react-icons/bs';
import { Tooltip } from 'react-tooltip';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';

export type DivingCylinderTableRow = {
  id: string;
  name?: string;
  volume?: number;
  material?: string;
  maxPressure?: number;
  serialNumber?: string;
  lastInspection?: string;
  cylinders?: DivingCylinderTableRow[];
};

export enum DivingCylinderMaterials {
  steel = 'steel',
  aluminium = 'aluminium',
  carbonFiber = 'carbonFiber',
}

const DCMaterialFiTranslation = (enMaterial: string): string => {
  switch (enMaterial) {
    case DivingCylinderMaterials.aluminium:
      return 'Alumiini';
    case DivingCylinderMaterials.carbonFiber:
      return 'Hiilikuitu';
    case DivingCylinderMaterials.steel:
      return 'Teräs';
    default:
      return enMaterial;
  }
};

const columnHelper = createColumnHelper<DivingCylinderTableRow>();

type CylinderTableActionCallbacks = {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export const buildCylinderTableColumns = ({
  onEdit,
  onDelete,
}: CylinderTableActionCallbacks) => [
  columnHelper.accessor('id', { id: 'id' }),
  columnHelper.accessor('name', { id: 'name', header: 'Nimi' }),
  columnHelper.accessor('volume', { id: 'size', header: 'Koko (l)' }),
  columnHelper.accessor('material', { id: 'material', header: 'Materiaali' }),
  columnHelper.accessor('maxPressure', {
    id: 'maxPressure',
    header: 'Maksimipaine (bar)',
  }),
  columnHelper.accessor('serialNumber', {
    id: 'serialNumber',
    header: 'Sarjanumero',
  }),
  columnHelper.accessor('lastInspection', {
    id: 'lastInspection',
    header: 'Katsastusvuosi',
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Toiminnot',
    cell: (cell) => {
      const isSubRow = cell.row.depth > 0;
      if (isSubRow) return null;

      const rowId = cell.row.id;
      const id: string = cell.row.getValue('id');
      return (
        <div className="d-flex justify-content-center gap-2 py-1">
          <button
            data-tooltip-id={`modify-set-${rowId}`}
            data-tooltip-content={'Muokkaa pullosettiä'}
            className="btn btn-primary"
            onClick={() => onEdit(id)}
          >
            <BsPencil />
          </button>
          <button
            data-tooltip-id={`delete-set-${rowId}`}
            data-tooltip-content={'Poista pullosetti'}
            className="btn btn-danger"
            onClick={() => onDelete(id)}
          >
            <BsTrash />
          </button>
          <Tooltip id={`modify-set-${rowId}`} />
          <Tooltip id={`delete-set-${rowId}`} />
        </div>
      );
    },
  }),
];

export const buildCylinderTableRows = (
  sets: DivingCylinderSet[],
): DivingCylinderTableRow[] =>
  [...sets].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((dcs) => ({
    id: dcs.id,
    name: dcs.name,
    lastInspection: undefined,
    volume: dcs.cylinders.reduce((acc, dc) => acc + dc.volume, 0),
    material: undefined,
    maxPressure: undefined,
    serialNumber: undefined,
    cylinders: dcs.cylinders.map((dc) => ({
      id: dc.id,
      cylinders: [],
      name: undefined,
      volume: dc.volume,
      material: DCMaterialFiTranslation(dc.material),
      maxPressure: dc.pressure,
      serialNumber: dc.serialNumber,
      lastInspection: format(dc.inspection, 'yyyy'),
    })),
  }));
