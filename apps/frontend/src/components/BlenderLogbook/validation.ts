import * as yup from 'yup';
import { FIELD_NUMBER, FIELD_REQUIRED } from '../../lib/validationUtils';

export const BLENDER_FILLING_EVENT_VALIDATION_SCHEMA = yup.object().shape({
  additionalInformation: yup.string().optional(),
  divingCylinderSetIds: yup.array().of(yup.string()).min(1, FIELD_REQUIRED),
  gasMixture: yup.string().required(FIELD_REQUIRED),
  heliumPercentage: yup
    .number()
    .typeError(FIELD_NUMBER)
    .min(0)
    .max(100)
    .optional(),
  oxygenPercentage: yup
    .number()
    .typeError(FIELD_NUMBER)
    .min(0)
    .max(100)
    .optional(),
  userConfirm: yup.boolean().isTrue(),
  fillingEventRows: yup.array().of(
    yup.object().shape({
      consumption: yup.number(),
      priceEurCents: yup.number(),
      startPressure: yup
        .number()
        .typeError(FIELD_NUMBER)
        .min(0)
        .required(FIELD_REQUIRED),
      endPressure: yup
        .number()
        .typeError(FIELD_NUMBER)
        .min(0)
        .required(FIELD_REQUIRED)
        .when(['startPressure'], (startPressure, schema) =>
          schema.max(
            startPressure as unknown as number,
            'Loppupaine liian korkea',
          ),
        ),
      storageCylinderId: yup.string().required(FIELD_REQUIRED),
    }),
  ),
  diluentFillingRows: yup.array().of(
    yup.object().shape({
      oxygenPercentage: yup
        .number()
        .typeError(FIELD_NUMBER)
        .min(0)
        .max(100)
        .optional(),
      heliumPercentage: yup
        .number()
        .typeError(FIELD_NUMBER)
        .min(0)
        .max(100)
        .optional()
        .when(['oxygenPercentage'], (oxygenPercentage, schema) =>
          schema.max(
            100 - (Number(oxygenPercentage) || 0),
            'Happi- ja heliumprosenttien summa saa olla enintään 100',
          ),
        ),
      startPressure: yup
        .number()
        .typeError(FIELD_NUMBER)
        .min(0)
        .required(FIELD_REQUIRED),
      endPressure: yup
        .number()
        .typeError(FIELD_NUMBER)
        .min(0)
        .required(FIELD_REQUIRED)
        .when(['startPressure'], (startPressure, schema) =>
          schema.max(
            startPressure as unknown as number,
            'Loppupaine liian korkea',
          ),
        ),
      storageCylinderId: yup.string().required(FIELD_REQUIRED),
    }),
  ),
});
