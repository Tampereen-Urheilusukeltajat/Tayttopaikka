import { type FieldArrayRenderProps } from 'formik';
import React from 'react';
import { BsTrash } from 'react-icons/bs';
import { type DivingCylinder } from '../../interfaces/DivingCylinderSet';
import { ButtonType, ElementButton } from '../common/Button/Buttons';
import { TextInput, DropdownMenu } from '../common/Inputs';
import styles from './NewCylinderSet.module.scss';

export type FormDivingCylinder = Omit<DivingCylinder, 'id'> & {
  uniqueId: string;
};

export type CylinderSetFormValues = {
  divingCylinderSetName: string;
  divingCylinders: FormDivingCylinder[];
};

export type CylinderSetCreatePayload = {
  name: string;
  cylinders: Array<Omit<DivingCylinder, 'id'>>;
};

export const emptyDivingCylinder = (
  material = 'steel',
  pressure = 0,
  inspection = '',
  volume = 0,
): FormDivingCylinder => ({
  material,
  pressure,
  inspection,
  serialNumber: '',
  uniqueId: crypto.randomUUID(),
  volume,
});

type NewCylinderRowProps = {
  fieldProps: FieldArrayRenderProps;
  index: number;
  lastItem: boolean;
  errors: any;
  firstCylinder?: Omit<DivingCylinder, 'id'>;
};

export const NewCylinderRow: React.FC<NewCylinderRowProps> = ({
  fieldProps,
  index,
  errors,
  lastItem,
  firstCylinder,
}) => {
  const { replace, remove, push } = fieldProps;
  return (
    <div>
      <div className={styles.cylinder}>
        <div className={styles.deleteButtonWrapper}>
          <ElementButton
            tooltip="Poista pullo"
            element={<BsTrash />}
            onClick={() => {
              lastItem && index === 0
                ? replace(index, { ...emptyDivingCylinder() })
                : remove(index);
            }}
          />
        </div>
        <TextInput
          label="Tilavuus"
          name={`divingCylinders.${index}.volume`}
          type="number"
          errorText={errors.divingCylinders?.at(index)?.volume}
          unit="l"
        />
        <DropdownMenu
          label="Materiaali"
          name={`divingCylinders.${index}.material`}
          errorText={errors.divingCylinders?.at(index)?.material}
        >
          <option value="steel">Teräs</option>
          <option value="aluminium">Alumiini</option>
          <option value="carbonFiber">Hiilikuitu</option>
        </DropdownMenu>
        <TextInput
          label="Suurin sallittu paine"
          name={`divingCylinders.${index}.pressure`}
          type="number"
          errorText={errors.divingCylinders?.at(index)?.pressure}
          unit="bar"
        />
        <TextInput
          label="Sarjanumero"
          name={`divingCylinders.${index}.serialNumber`}
          type="string"
          errorText={errors.divingCylinders?.at(index)?.serialNumber}
        />
        <TextInput
          label="Katsastusvuosi"
          name={`divingCylinders.${index}.inspection`}
          type="number"
          errorText={errors.divingCylinders?.at(index)?.inspection}
        />
      </div>
      {lastItem ? (
        <ElementButton
          onClick={() => {
            push({
              ...emptyDivingCylinder(
                firstCylinder?.material,
                firstCylinder?.pressure,
                firstCylinder?.inspection,
                firstCylinder?.volume,
              ),
            });
          }}
          className="w-100"
          type={ButtonType.button}
          element={<>Lisää pullo</>}
        />
      ) : null}
    </div>
  );
};
