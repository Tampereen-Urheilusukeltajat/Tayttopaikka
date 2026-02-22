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
  const [showClubCylinders, setShowClubCylinders] = useState(false);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">Esitiedot</h2>
        {clubCylinderSets.length > 0 && (
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
          <DropdownMenu
            disabled={values.userConfirm}
            errorText={errors.divingCylinderSetId}
            label="Pullosetti"
            name="divingCylinderSetId"
            type="select"
          >
            <optgroup label="Omat pullot">
              {divingCylinderSets.map((dcs) => (
                <option key={dcs.id} value={dcs.id}>
                  {/* If multiple cylinders with the same name are found, also add serial number to the name */}
                  {dcs.name}
                  {divingCylinderSets.filter((e) => e.name === dcs.name)
                    .length > 1
                    ? ` (${dcs.cylinders[0]?.serialNumber ?? 'N/A'})`
                    : ''}
                </option>
              ))}
            </optgroup>
            {showClubCylinders && clubCylinderSets.length > 0 && (
              <optgroup label="Seuran pullot">
                {clubCylinderSets.map((dcs) => (
                  <option key={dcs.id} value={dcs.id}>
                    {dcs.name}
                    {clubCylinderSets.filter((e) => e.name === dcs.name)
                      .length > 1
                      ? ` (${dcs.cylinders[0]?.serialNumber ?? 'N/A'})`
                      : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </DropdownMenu>
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
