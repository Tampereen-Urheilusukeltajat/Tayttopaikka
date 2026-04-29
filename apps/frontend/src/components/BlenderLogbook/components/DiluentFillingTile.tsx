import { FieldArray } from 'formik';
import React from 'react';
import { BsInfoCircle, BsTrash } from 'react-icons/bs';
import { InputGroup, OverlayTrigger, Popover } from 'react-bootstrap';
import { type GasWithPricing } from '../../../lib/queries/gasQuery';
import { type StorageCylinder } from '../../../lib/queries/storageCylinderQuery';
import {
  AvailableGasses,
  AvailableMixtures,
  formatEurCentsToEur,
} from '../../../lib/utils';
import {
  ButtonType,
  ElementButton,
  PrimaryButton,
} from '../../common/Button/Buttons';
import { DropdownMenu, TextInput } from '../../common/Inputs';
import styles from './FillingTile.module.scss';
import { type CommonTileProps, emptyDiluentFillingRow } from '../BlenderLogbook';

type DiluentRow = {
  startPressure: number;
  endPressure: number;
  oxygenPercentage: string;
  heliumPercentage: string;
};

/** Returns the row price in EUR (same unit as regular fillingEventRows.priceEurCents). */
export const calcDiluentRowPriceEur = (
  row: DiluentRow,
  cylinder: StorageCylinder | undefined,
  o2PriceCents: number,
  hePriceCents: number,
): number => {
  if (!cylinder) return 0;
  const totalVolumeLitres = Math.ceil(row.startPressure - row.endPressure) * cylinder.volume;
  const o2Pct = Number(row.oxygenPercentage);
  const hePct = Number(row.heliumPercentage);
  const totalCents = Math.ceil(
    ((o2Pct / 100) * o2PriceCents + (hePct / 100) * hePriceCents) * totalVolumeLitres,
  );
  return formatEurCentsToEur(totalCents);
};

type ReadOnlyFieldProps = { label: string; value: number; unit: string };

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value, unit }) => (
  <div className="inputField">
    <label className="field-title">{label}</label>
    <InputGroup>
      <input className="form-control" disabled readOnly value={value} />
      <InputGroup.Text>{unit}</InputGroup.Text>
    </InputGroup>
  </div>
);

type DiluentRowProps = CommonTileProps & {
  index: number;
  remove: (index: number) => void;
  diluentCylinders: StorageCylinder[];
  gases: GasWithPricing[];
};

const DiluentRowComponent: React.FC<DiluentRowProps> = ({
  index,
  errors,
  values,
  remove,
  diluentCylinders,
  gases,
}) => {
  const row = values.diluentFillingRows.at(index);
  const cylinder = diluentCylinders.find((sc) => sc.id === row?.storageCylinderId);
  const o2PriceCents = gases.find((g) => g.gasName === AvailableGasses.oxygen)?.priceEurCents ?? 0;
  const hePriceCents = gases.find((g) => g.gasName === AvailableGasses.helium)?.priceEurCents ?? 0;

  const totalVolumeLitres =
    cylinder && row ? Math.ceil(row.startPressure - row.endPressure) * cylinder.volume : 0;

  const o2Pct = Number(row?.oxygenPercentage ?? 0);
  const hePct = Number(row?.heliumPercentage ?? 0);

  const o2VolumeLitres = (o2Pct / 100) * totalVolumeLitres;
  const heVolumeLitres = (hePct / 100) * totalVolumeLitres;

  const priceEur = row ? calcDiluentRowPriceEur(row, cylinder, o2PriceCents, hePriceCents) : 0;

  return (
    <div className={styles.fillingRow}>
      <div className={styles.deleteButtonWrapper}>
        <ElementButton
          disabled={values.userConfirm}
          element={<BsTrash />}
          onClick={() => remove(index)}
        />
      </div>

      <DropdownMenu
          disabled={values.userConfirm}
          label="Diluenttipullo"
          name={`diluentFillingRows.${index}.storageCylinderId`}
          errorText={errors.diluentFillingRows?.at(index)?.storageCylinderId}
        >
          {diluentCylinders.map((sc) => (
            <option
              disabled={values.diluentFillingRows.some(
                (r, i) => i !== index && r.storageCylinderId === sc.id,
              )}
              key={sc.id}
              value={sc.id}
            >
              {sc.name}
            </option>
          ))}
        </DropdownMenu>

      <TextInput
        disabled={values.userConfirm}
        label="Happiprosentti"
        name={`diluentFillingRows.${index}.oxygenPercentage`}
        unit="%"
        errorText={errors.diluentFillingRows?.at(index)?.oxygenPercentage}
      />
      <TextInput
        disabled={values.userConfirm}
        label="Heliumprosentti"
        name={`diluentFillingRows.${index}.heliumPercentage`}
        unit="%"
        errorText={errors.diluentFillingRows?.at(index)?.heliumPercentage}
      />
      <TextInput
        disabled={values.userConfirm}
        label="Lähtöpaine"
        name={`diluentFillingRows.${index}.startPressure`}
        unit="bar"
        errorText={errors.diluentFillingRows?.at(index)?.startPressure}
      />
      <TextInput
        disabled={values.userConfirm}
        label="Loppupaine"
        name={`diluentFillingRows.${index}.endPressure`}
        unit="bar"
        errorText={errors.diluentFillingRows?.at(index)?.endPressure}
      />
      <ReadOnlyField label="Kulutus" value={totalVolumeLitres} unit="l" />
      <ReadOnlyField label="Happitilavuus" value={o2VolumeLitres} unit="l" />
      <ReadOnlyField label="Heliumtilavuus" value={heVolumeLitres} unit="l" />
      <ReadOnlyField label="Hinta" value={priceEur} unit="€" />
    </div>
  );
};

type DiluentFillingTileProps = CommonTileProps & {
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  diluentCylinders: StorageCylinder[];
  gases: GasWithPricing[];
};

export const DiluentFillingTile: React.FC<DiluentFillingTileProps> = ({
  errors,
  values,
  setFieldValue,
  diluentCylinders,
  gases,
}) => {
  const isTrimixLike =
    values.gasMixture === AvailableMixtures.Trimix ||
    values.gasMixture === AvailableMixtures.Heliox;

  if (!isTrimixLike) return null;
  if (diluentCylinders.length === 0) return null;

  return (
    <div className="pt-3 pb-3 border-bottom">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h2 className="mb-0">Diluenttitäyttö</h2>
        <OverlayTrigger
          trigger="click"
          placement="right"
          rootClose
          overlay={
            <Popover>
              <Popover.Header>Hinnan laskenta</Popover.Header>
              <Popover.Body>
                <p className="mb-2">
                  <strong>Täyttö:</strong> Valitse varastopullo (jos useampi kuin yksi), syötä sen kaasun koostumus
                  (O₂% ja He%) sekä varastopullon paine ennen ja jälkeen täytön.
                  Hinta lasketaan automaattisesti.
                </p>
                <hr className="my-2" />
                <p className="mb-1">
                  <strong>Kaava:</strong>{' '}
                  <code>⌈(O2% × O2-hinta + He% × He-hinta) × kulutus⌉</code>
                </p>
                <p className="mb-1">
                  <strong>Kulutus</strong> = (lähtöpaine − loppupaine) × varastopullon tilavuus
                </p>
                <hr className="my-2" />
                <p className="mb-1">
                  <strong>Esimerkki:</strong> Varastopullo analysoidaan ja sen koostumus on TRIMIX 21/35. Varastopullosta (50 l) otetaan kaasua 200→195 bar
                </p>
                <p className="mb-1">Kulutus: (200−195) × 50 = 250 l</p>
                <p className="mb-0">
                  ⌈(0,21 × 5 snt + 0,35 × 12 snt) × 250⌉ = ⌈1312,5⌉ = <strong>1313 snt = 13,13 €</strong>
                </p>
              </Popover.Body>
            </Popover>
          }
        >
          <button
            type="button"
            className="btn btn-link p-0 text-secondary"
            aria-label="Näytä hinnan laskentaohje"
          >
            <BsInfoCircle size={18} />
          </button>
        </OverlayTrigger>
      </div>

      <FieldArray name="diluentFillingRows">
        {({ remove, push }) => (
          <>
            {values.diluentFillingRows.map((row, index) => (
              <DiluentRowComponent
                key={row.uniqueId}
                errors={errors}
                index={index}
                diluentCylinders={diluentCylinders}
                gases={gases}
                remove={remove}
                values={values}
              />
            ))}
            <div className={styles.addRow}>
              {values.diluentFillingRows.length < diluentCylinders.length && (
                <PrimaryButton
                  disabled={values.userConfirm}
                  onClick={() => {
                    if (values.diluentFillingRows.length === 0) {
                      void setFieldValue('diluentFillingRows', [
                        emptyDiluentFillingRow(diluentCylinders, []),
                      ]);
                    } else {
                      push(emptyDiluentFillingRow(diluentCylinders, values.diluentFillingRows));
                    }
                  }}
                  type={ButtonType.button}
                  text="Lisää diluenttitäyttö"
                />
              )}
            </div>
          </>
        )}
      </FieldArray>
    </div>
  );
};
