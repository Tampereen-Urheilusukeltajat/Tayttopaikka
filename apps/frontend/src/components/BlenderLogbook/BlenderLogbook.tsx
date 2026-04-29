import React, { useCallback } from 'react';
import styles from './BlenderLogbook.module.scss';
import { type Compressor } from '../../lib/queries/compressorQuery';
import { type GasWithPricing } from '../../lib/queries/gasQuery';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';
import { type StorageCylinder } from '../../lib/queries/storageCylinderQuery';
import { Form, Formik, type FormikHelpers } from 'formik';
import { BasicInfoTile } from './components/BasicInfoTile';
import { PricingTile } from './components/PricingTile';
import { FillingTile } from './components/FillingTile';
import {
  DiluentFillingTile,
  calcDiluentRowPriceEur,
} from './components/DiluentFillingTile';
import { SavingTile } from './components/SavingTile';
import {
  AvailableGasses,
  AvailableMixtureCompositions,
  AvailableMixtures,
  formalizeGasMixture,
  formatEurToEurCents,
} from '../../lib/utils';
import { BLENDER_FILLING_EVENT_VALIDATION_SCHEMA } from './validation';
import { useMutation } from '@tanstack/react-query';
import {
  type DiluentCylinderUsage,
  type NewFillEvent,
  type StorageCylinderUsage,
} from '../../interfaces/FillEvent';
import { postFillEvent } from '../../lib/apiRequests/fillEventRequests';
import { toast } from 'react-toastify';

type NewFillingEventProps = {
  compressors: Compressor[];
  divingCylinderSets: DivingCylinderSet[];
  clubCylinderSets?: DivingCylinderSet[];
  gases: GasWithPricing[];
  storageCylinders: StorageCylinder[];
};

type FillingEventBasicInfo = {
  additionalInformation: string;
  divingCylinderSetId: string;
  gasMixture: AvailableMixtures;
  heliumPercentage: string;
  oxygenPercentage: string;
  userConfirm: boolean;
  compressorId: string;
};

type FillingEventRow = {
  consumption: number;
  endPressure: number;
  priceEurCents: number;
  startPressure: number;
  storageCylinderId: string;
  uniqueId: string;
};

type DiluentFillingRow = {
  endPressure: number;
  heliumPercentage: string;
  oxygenPercentage: string;
  startPressure: number;
  storageCylinderId: string;
  uniqueId: string;
};

type FormFields = FillingEventBasicInfo & {
  diluentFillingRows: DiluentFillingRow[];
  fillingEventRows: FillingEventRow[];
};

// TODO find a better way to initialize divingCylinderSetId
const EMPTY_FILLING_EVENT_BASIC_INFO: FillingEventBasicInfo = {
  additionalInformation: '',
  divingCylinderSetId: '',
  heliumPercentage: '0',
  gasMixture: AvailableMixtureCompositions[0].id,
  oxygenPercentage: '21',
  userConfirm: false,
  compressorId: '',
};

export const emptyFillingRow = (startPressure = 0): FillingEventRow => ({
  consumption: 0,
  endPressure: startPressure,
  priceEurCents: 0,
  startPressure,
  storageCylinderId: '',
  uniqueId: crypto.randomUUID(),
});

export const emptyDiluentFillingRow = (
  diluentCylinders: StorageCylinder[],
  existingRows: DiluentFillingRow[],
): DiluentFillingRow => {
  // Auto-select the first cylinder not already in use
  const usedIds = new Set(existingRows.map((r) => r.storageCylinderId));
  const available = diluentCylinders.find((sc) => !usedIds.has(sc.id));
  return {
    endPressure: 0,
    heliumPercentage: '',
    oxygenPercentage: '',
    startPressure: 0,
    storageCylinderId: available?.id ?? diluentCylinders[0]?.id ?? '',
    uniqueId: crypto.randomUUID(),
  };
};

export type CommonTileProps = {
  // TODO FIX THIS
  // Casting as any because array errors wouldn't be otherwise correctly typed
  // It might be possible to fix this in the future with bit more time
  errors: any;
  values: FormFields;
};

export const NewBlenderFillingEvent: React.FC<NewFillingEventProps> = ({
  compressors,
  divingCylinderSets,
  clubCylinderSets = [],
  gases,
  storageCylinders,
}) => {
  const diluentGasId = gases.find((g) => g.gasName === AvailableGasses.diluent)?.gasId;
  const diluentCylinders = storageCylinders.filter((sc) => sc.gasId === diluentGasId);
  const regularStorageCylinders = storageCylinders.filter((sc) => sc.gasId !== diluentGasId);
  const fillEventMutation = useMutation({
    mutationFn: async (payload: NewFillEvent) => postFillEvent(payload),
    onError: () => {
      toast.error(
        'Uuden täyttötapahtuman luominen epäonnistui. Tarkista tiedot ja yritä uudelleen.',
      );
    },
  });

  const handleFormSubmit = useCallback(
    (values: FormFields, helpers: FormikHelpers<FormFields>) => {
      const formalizedGasMixture = formalizeGasMixture(
        values.gasMixture,
        values.oxygenPercentage,
        values.heliumPercentage,
      );

      const gasFillTotal = values.fillingEventRows
        .map((row) => row.priceEurCents)
        .reduce((sum, price) => sum + price, 0);
      const o2PriceCents = gases.find((g) => g.gasName === AvailableGasses.oxygen)?.priceEurCents ?? 0;
      const hePriceCents = gases.find((g) => g.gasName === AvailableGasses.helium)?.priceEurCents ?? 0;
      const diluentFillTotal = values.diluentFillingRows.reduce((sum, row) => {
        const cyl = diluentCylinders.find((sc) => sc.id === row.storageCylinderId);
        return sum + calcDiluentRowPriceEur(row, cyl, o2PriceCents, hePriceCents);
      }, 0);
      const totalPriceEurCents = formatEurToEurCents(gasFillTotal + diluentFillTotal);

      // Allow user to do pure air fills via Happihäkki page
      const filledAir =
        values.gasMixture === AvailableMixtures.Nitrox &&
        values.fillingEventRows.length === 0;

      fillEventMutation.mutate(
        {
          cylinderSetId: values.divingCylinderSetId,
          description: values.additionalInformation,
          filledAir,
          gasMixture: formalizedGasMixture,
          price: totalPriceEurCents,
          storageCylinderUsageArr:
            values.fillingEventRows.map<StorageCylinderUsage>((row) => ({
              storageCylinderId: Number(row.storageCylinderId),
              endPressure: row.endPressure,
              startPressure: row.startPressure,
            })),
          diluentCylinderUsageArr:
            values.diluentFillingRows.length > 0
              ? values.diluentFillingRows.map<DiluentCylinderUsage>((row) => ({
                  storageCylinderId: Number(row.storageCylinderId),
                  endPressure: row.endPressure,
                  startPressure: row.startPressure,
                  oxygenPercentage: Number(row.oxygenPercentage),
                  heliumPercentage: Number(row.heliumPercentage),
                }))
              : undefined,
          compressorId: values.compressorId ? values.compressorId : undefined,
        },
        {
          onSuccess: () => {
            toast.success('Uusi täyttötapahtuma lisätty!');
            helpers.resetForm();
          },
          onSettled: () => {
            helpers.setSubmitting(false);
          },
        },
      );
    },
    [diluentCylinders, fillEventMutation, gases],
  );

  return (
    <div>
      <h1 className="pb-4">Luo uusi täyttötapahtuma</h1>

      <Formik
        initialValues={{
          ...EMPTY_FILLING_EVENT_BASIC_INFO,
          divingCylinderSetId: divingCylinderSets[0]?.id ?? '',
          compressorId: compressors[0].id ?? '',
          diluentFillingRows: [] as DiluentFillingRow[],
          fillingEventRows: [
            {
              ...emptyFillingRow(),
              storageCylinderId: regularStorageCylinders[0]?.id ?? '',
            },
          ],
        } satisfies FormFields}
        validateOnBlur={false}
        validateOnChange={false}
        validationSchema={BLENDER_FILLING_EVENT_VALIDATION_SCHEMA}
        onSubmit={handleFormSubmit}
      >
        {({ errors, values, setFieldValue, isSubmitting }) => (
          <Form className={styles.form}>
            <div className="d-flex justify-content-between gap-3 pb-3 border-bottom">
              <BasicInfoTile
                compressors={compressors}
                divingCylinderSets={divingCylinderSets}
                clubCylinderSets={clubCylinderSets}
                errors={errors}
                values={values}
              />
              <PricingTile errors={errors} gases={gases.filter((g) => g.gasName !== AvailableGasses.diluent)} values={values} />
            </div>

            <FillingTile
              setFieldValue={setFieldValue}
              errors={errors}
              values={values}
              storageCylinders={regularStorageCylinders}
              gases={gases}
            />

            <DiluentFillingTile
              errors={errors}
              values={values}
              setFieldValue={setFieldValue}
              diluentCylinders={diluentCylinders}
              gases={gases}
            />

            <SavingTile
              totalPrice={
                values.fillingEventRows
                  .map((row) => row.priceEurCents)
                  .reduce((sum, price) => sum + price, 0) +
                (() => {
                  const o2P = gases.find((g) => g.gasName === AvailableGasses.oxygen)?.priceEurCents ?? 0;
                  const heP = gases.find((g) => g.gasName === AvailableGasses.helium)?.priceEurCents ?? 0;
                  return values.diluentFillingRows.reduce((sum, row) => {
                    const cyl = diluentCylinders.find((sc) => sc.id === row.storageCylinderId);
                    return sum + calcDiluentRowPriceEur(row, cyl, o2P, heP);
                  }, 0);
                })()
              }
              errors={errors}
              values={values}
              isSubmitting={isSubmitting}
            />
          </Form>
        )}
      </Formik>
    </div>
  );
};
