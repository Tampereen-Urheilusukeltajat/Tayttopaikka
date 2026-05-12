import { FieldArray, Formik, Form } from 'formik';
import React, { useCallback } from 'react';
import { ButtonType, PrimaryButton } from '../common/Button/Buttons';
import { NEW_CYLINDER_SET_VALIDATION_SCHEMA } from '../CylinderSet/validation';
import { TextInput } from '../common/Inputs';
import styles from '../CylinderSet/NewCylinderSet.module.scss';
import {
  type CylinderSetCreatePayload,
  type CylinderSetFormValues,
  emptyDivingCylinder,
  NewCylinderRow,
} from '../CylinderSet/NewCylinderRow';

type NewClubCylinderSetProps = {
  onSubmit: (payload: CylinderSetCreatePayload) => void;
};

export const NewClubCylinderSet: React.FC<NewClubCylinderSetProps> = ({
  onSubmit,
}) => {
  const handleFormSubmit = useCallback(
    (values: CylinderSetFormValues) => {
      onSubmit({
        name: values.divingCylinderSetName,
        cylinders: values.divingCylinders.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ uniqueId: _id, ...dc }) => dc,
        ),
      });
    },
    [onSubmit],
  );

  return (
    <div className="mt-5">
      <h1 className="pb-4">Uusi seuran pullosetti</h1>
      <Formik
        initialValues={{
          divingCylinderSetName: '',
          divingCylinders: [{ ...emptyDivingCylinder() }],
        }}
        validateOnChange={false}
        validateOnBlur={false}
        validationSchema={NEW_CYLINDER_SET_VALIDATION_SCHEMA}
        onSubmit={handleFormSubmit}
      >
        {({ values, errors, isSubmitting }) => (
          <Form className={styles.form}>
            <h2>Yleistiedot</h2>
            <TextInput
              name="divingCylinderSetName"
              placeholder="Esim. D12"
              label="Pullosetin nimi"
              errorText={errors.divingCylinderSetName}
            />
            <h2 className="pt-3">Pullot</h2>
            <FieldArray name="divingCylinders">
              {(arrayHelpers) =>
                values.divingCylinders.map((dc, index) => (
                  <NewCylinderRow
                    key={dc.uniqueId}
                    errors={errors}
                    fieldProps={arrayHelpers}
                    index={index}
                    lastItem={values.divingCylinders.length === index + 1}
                    firstCylinder={values.divingCylinders[0]}
                  />
                ))
              }
            </FieldArray>

            <div className={styles.submit}>
              <PrimaryButton
                disabled={isSubmitting}
                text="Tallenna pullosetti"
                type={ButtonType.submit}
              />
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
