import { type DivingCylinderSet } from '../../../interfaces/DivingCylinderSet';
import { DropdownMenu, TextInput } from '../../common/Inputs';
import React, { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import {
  AvailableGasses,
  AvailableMixtureCompositions,
  AvailableMixtures,
  mapMixtureToLabel,
} from '../../../lib/utils';
import { type CommonTileProps } from '../BlenderLogbook';
import { type Compressor } from '../../../lib/queries/compressorQuery';
import { useFormikContext } from 'formik';
import { ChipSelect } from '../../common/ChipSelect';

enum FillingMethod {
  PartialPressure = 'partial',
  ContinuousFlow = 'continuous',
}

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
  const [fillingMethod, setFillingMethod] = useState<FillingMethod>(
    FillingMethod.ContinuousFlow,
  );

  const selectedMixture = AvailableMixtureCompositions.find(
    (m) => m.id === values.gasMixture,
  );
  const isArgonSelected = values.gasMixture === AvailableMixtures.Argon;
  // Argon is always filled by partial pressure, regardless of the last method the user picked.
  const effectiveFillingMethod = isArgonSelected
    ? FillingMethod.PartialPressure
    : fillingMethod;

  useEffect(() => {
    if (!selectedMixture?.fixedComposition) return;
    void setFieldValue(
      'oxygenPercentage',
      selectedMixture.fixedComposition.oxygenPercentage,
    );
    void setFieldValue(
      'heliumPercentage',
      selectedMixture.fixedComposition.heliumPercentage,
    );
  }, [selectedMixture, setFieldValue]);

  // TODO: there is currently only one continuous-flow compressor, so it's
  // auto-selected without asking the user. If a club ever configures more
  // than one, replace this with a compressor picker.
  useEffect(() => {
    void setFieldValue(
      'compressorId',
      effectiveFillingMethod === FillingMethod.ContinuousFlow
        ? compressors[0]?.id ?? ''
        : '',
    );
  }, [effectiveFillingMethod, compressors, setFieldValue]);

  const orderedCylinderSets = divingCylinderSets.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  const orderedClubCylinderSets = clubCylinderSets.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );

  const toOption = (dcs: DivingCylinderSet, allSets: DivingCylinderSet[]) => ({
    value: dcs.id,
    label:
      dcs.name +
      (allSets.filter((e) => e.name === dcs.name).length > 1
        ? ` (${dcs.cylinders[0]?.serialNumber ?? 'N/A'})`
        : ''),
  });

  const allSets = [...orderedCylinderSets, ...orderedClubCylinderSets];
  const optionGroups = [
    {
      groupLabel: 'Omat pullot',
      options: orderedCylinderSets.map((dcs) => toOption(dcs, allSets)),
    },
    ...(showClubCylinders && orderedClubCylinderSets.length > 0
      ? [
          {
            groupLabel: 'Seuran pullot',
            options: orderedClubCylinderSets.map((dcs) =>
              toOption(dcs, allSets),
            ),
          },
        ]
      : []),
  ];

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
          <ChipSelect
            label="Pullosetti"
            optionGroups={optionGroups}
            selectedValues={values.divingCylinderSetIds}
            onChange={(next) => {
              void setFieldValue('divingCylinderSetIds', next);
            }}
            disabled={values.userConfirm}
            errorText={
              errors.divingCylinderSetIds
                ? String(errors.divingCylinderSetIds)
                : undefined
            }
            style={{ minWidth: '180px' }}
          />
          <div className="d-flex flex-column gap-1">
            <span className="field-title">Täyttötapa</span>
            <Form.Check
              type="radio"
              id="filling-method-continuous"
              label="Jatkuvan virtauksen täyttö"
              checked={effectiveFillingMethod === FillingMethod.ContinuousFlow}
              disabled={values.userConfirm || isArgonSelected}
              onChange={() => setFillingMethod(FillingMethod.ContinuousFlow)}
            />
            <Form.Check
              type="radio"
              id="filling-method-partial"
              label="Osapainetäyttö"
              checked={effectiveFillingMethod === FillingMethod.PartialPressure}
              disabled={values.userConfirm}
              onChange={() => setFillingMethod(FillingMethod.PartialPressure)}
            />
          </div>
          <TextInput
            disabled={values.userConfirm}
            errorText={errors.additionalInformation}
            label="Lisätiedot"
            name="additionalInformation"
          />
        </div>

        <div className="d-flex gap-3 flex-wrap">
          <DropdownMenu
            disabled={
              values.userConfirm || values.diluentFillingRows.length > 0
            }
            name="gasMixture"
            label="Kaasuseos"
            tooltip={
              !values.userConfirm && values.diluentFillingRows.length > 0
                ? 'Diluenttitäyttö lisätty, kaasuseos on aina TRIMIX'
                : undefined
            }
          >
            {AvailableMixtureCompositions.map((mix) => (
              <option key={mix.id} value={mix.id}>
                {mapMixtureToLabel(mix.id)}
              </option>
            ))}
          </DropdownMenu>

          <TextInput
            disabled={
              values.userConfirm ||
              !!selectedMixture?.fixedComposition ||
              selectedMixture?.components.includes(AvailableGasses.oxygen) ===
                false
            }
            errorText={errors.oxygenPercentage}
            label="Happi %"
            name="oxygenPercentage"
            unit="%"
          />
          <TextInput
            disabled={
              values.userConfirm ||
              !!selectedMixture?.fixedComposition ||
              selectedMixture?.components.includes(AvailableGasses.helium) ===
                false
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
