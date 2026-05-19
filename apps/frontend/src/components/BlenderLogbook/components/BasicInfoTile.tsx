import { type DivingCylinderSet } from '../../../interfaces/DivingCylinderSet';
import { DropdownMenu, TextInput } from '../../common/Inputs';
import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import {
  AvailableGasses,
  AvailableMixtureCompositions,
} from '../../../lib/utils';
import { type CommonTileProps } from '../BlenderLogbook';
import { type Compressor } from '../../../lib/queries/compressorQuery';
import { useFormikContext } from 'formik';

type BasicInfoTileProps = CommonTileProps & {
  divingCylinderSets: DivingCylinderSet[];
  clubCylinderSets?: DivingCylinderSet[];
  compressors: Compressor[];
};

export const BasicInfoTile: React.FC<BasicInfoTileProps> = ({
  compressors,
  divingCylinderSets,
  clubCylinderSets = [],
  errors,
  values,
}) => {
  const { setFieldValue } = useFormikContext();
  const [showClubCylinders, setShowClubCylinders] = useState(false);

  const orderedCylinderSets = divingCylinderSets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const orderedClubCylinderSets = clubCylinderSets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const visibleSets = showClubCylinders
    ? [...orderedCylinderSets, ...orderedClubCylinderSets]
    : orderedCylinderSets;

  const toggleCylinderSet = (id: string, checked: boolean): void => {
    const current: string[] = values.divingCylinderSetIds;
    const next = checked ? [...current, id] : current.filter((x) => x !== id);
    void setFieldValue('divingCylinderSetIds', next);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">Esitiedot</h2>
        {orderedClubCylinderSets.length > 0 && (
          <Form.Check
            type="switch"
            id="show-club-cylinders-blender"
            label="Näytä seuran pullot"
            checked={showClubCylinders}
            onChange={(e) => setShowClubCylinders(e.target.checked)}
            style={{
              fontSize: '1rem',
            }}
          />
        )}
      </div>
      <div className="d-flex flex-column gap-3">
        <div className="d-flex gap-3 flex-wrap">
          <div>
            <Form.Label>Pullosetti</Form.Label>
            {errors.divingCylinderSetIds && (
              <div className="text-danger small">{String(errors.divingCylinderSetIds)}</div>
            )}
            <div className="d-flex flex-column gap-1">
              {visibleSets.map((dcs) => {
                const allSets = [...orderedCylinderSets, ...orderedClubCylinderSets];
                const label =
                  dcs.name +
                  (allSets.filter((e) => e.name === dcs.name).length > 1
                    ? ` (${dcs.cylinders[0]?.serialNumber ?? 'N/A'})`
                    : '');
                return (
                  <Form.Check
                    key={dcs.id}
                    type="checkbox"
                    id={`cylinder-set-${dcs.id}`}
                    label={label}
                    disabled={values.userConfirm}
                    checked={values.divingCylinderSetIds.includes(dcs.id)}
                    onChange={(e) => toggleCylinderSet(dcs.id, e.target.checked)}
                  />
                );
              })}
            </div>
          </div>
          <DropdownMenu
            name="compressorId"
            label="Kompressori"
            disabled={values.userConfirm}
            errorText={errors.compressorId}
          >
            {compressors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option key="empty" value="">
              Ei kompressoria (tyhjä)
            </option>
          </DropdownMenu>
          <TextInput
            disabled={values.userConfirm}
            errorText={errors.additionalInformation}
            label="Lisätiedot"
            name="additionalInformation"
          />
        </div>

        <div className="d-flex gap-3 flex-wrap">
          <DropdownMenu
            disabled={values.userConfirm}
            name="gasMixture"
            label="Kaasuseos"
          >
            {AvailableMixtureCompositions.map((mix) => (
              <option key={mix.id} value={mix.id}>
                {mix.id}
              </option>
            ))}
          </DropdownMenu>

          <TextInput
            disabled={
              values.userConfirm ||
              AvailableMixtureCompositions.find(
                (m) => m.id === values.gasMixture,
              )?.components.includes(AvailableGasses.oxygen) === false
            }
            errorText={errors.oxygenPercentage}
            label="Happi %"
            name="oxygenPercentage"
            unit="%"
          />
          <TextInput
            disabled={
              values.userConfirm ||
              AvailableMixtureCompositions.find(
                (m) => m.id === values.gasMixture,
              )?.components.includes(AvailableGasses.helium) === false
            }
            errorText={errors.heliumPercentage}
            label="Helium %"
            name="heliumPercentage"
            unit="%"
          />
        </div>
      </div>
    </div>
  );
};
