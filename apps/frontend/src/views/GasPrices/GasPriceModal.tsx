import * as yup from 'yup';
import { Formik, Form } from 'formik';
import React, { useCallback } from 'react';
import { Modal } from '../../components/common/Modal/Modal';
import { TextInput } from '../../components/common/Inputs';
import { type GasWithPricing } from '../../lib/queries/gasQuery';
import { useCreateGasPriceMutation } from '../../lib/queries/gasMutations';
import { mapGasToName } from '../../lib/utils';
import { FIELD_NUMBER, FIELD_REQUIRED } from '../../lib/validationUtils';

type Props = {
  gas: GasWithPricing;
  onClose: () => void;
};

type FormValues = {
  priceEur: string;
  activeFrom: string;
};

const getTomorrowString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('sv-SE'); // gives YYYY-MM-DD in local timezone
};

const VALIDATION_SCHEMA = yup.object().shape({
  priceEur: yup
    .number()
    .required(FIELD_REQUIRED)
    .min(0, 'Hinnan täytyy olla vähintään 0')
    .max(99.999, 'Hinta ei voi ylittää 99,999 €/l')
    .test(
      'cents-precision',
      'Hinnalla voi olla enintään 3 desimaalia (tarkkuus 0,001 €/l)',
      (value) =>
        value === undefined ||
        Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-9,
    )
    .typeError(FIELD_NUMBER),
  activeFrom: yup
    .string()
    .required(FIELD_REQUIRED)
    .test(
      'min-tomorrow',
      'Voimaantulopäivä voi olla aikaisintaan huomenna',
      (value) => !value || value >= getTomorrowString(),
    ),
});

export const GasPriceModal: React.FC<Props> = ({ gas, onClose }) => {
  const { mutate, isPending } = useCreateGasPriceMutation(onClose);

  const handleSubmit = useCallback(
    (values: FormValues) => {
      mutate({
        gasId: gas.gasId,
        priceEurCents: Math.round(parseFloat(values.priceEur) * 1000) / 10,
        activeFrom: `${values.activeFrom}T00:00:00Z`,
      });
    },
    [mutate, gas.gasId],
  );

  const tomorrow = getTomorrowString();

  return (
    <Formik
      initialValues={{ priceEur: '', activeFrom: tomorrow }}
      validationSchema={VALIDATION_SCHEMA}
      onSubmit={handleSubmit}
    >
      {({ errors, submitForm }) => (
        <Modal
          isOpen
          onClose={onClose}
          onConfirm={submitForm}
          title={`Päivitä ${mapGasToName(gas.gasName)} hinta`}
          confirmButtonText={isPending ? 'Tallennetaan...' : 'Tallenna'}
        >
          <Form>
            <TextInput
              label="Uusi hinta"
              name="priceEur"
              type="number"
              unit="€/l"
              errorText={errors.priceEur}
            />
            <TextInput
              label="Voimaantulopäivä"
              name="activeFrom"
              type="date"
              errorText={errors.activeFrom}
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
};
