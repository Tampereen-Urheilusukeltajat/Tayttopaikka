import React from 'react';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';
import { Formik } from 'formik';
import { Modal } from '../common/Modal/Modal';
import { Form } from 'react-bootstrap';
import { TextInput } from '../common/Inputs';
import { format } from 'date-fns';
import { type PatchDivingCylinderSetPayload } from '../../lib/apiRequests/divingCylinderSetRequests';
import { PATCH_DIVING_CYLINDER_SET_VALIDATION_SCHEMA } from '../CylinderSet/validation';

type PatchArgs = {
  divingCylinderSetId: string;
  payload: PatchDivingCylinderSetPayload;
};

type ModifyDivingCylinderSetModalProps = {
  divingCylinderSet: DivingCylinderSet;
  showModifyDivingCylinderModal: boolean;
  closeModal: () => void;
  onPatch: (args: PatchArgs) => void;
  userId: string;
};

export const ModifyDivingCylinderSetModal: React.FC<
  ModifyDivingCylinderSetModalProps
> = ({
  divingCylinderSet,
  showModifyDivingCylinderModal,
  closeModal,
  onPatch,
}) => {

  return (
    <Formik
      initialValues={{
        name: divingCylinderSet.name,
        inspectionYear: format(
          divingCylinderSet.cylinders[0].inspection,
          'yyyy',
        ),
      }}
      validationSchema={PATCH_DIVING_CYLINDER_SET_VALIDATION_SCHEMA}
      onSubmit={(values) => {
        const updatePayload = {
          name: values.name,
          cylinders: divingCylinderSet.cylinders.map((dc) => ({
            id: dc.id,
            inspection: format(values.inspectionYear, 'yyyy-MM-dd'),
          })),
        };

        onPatch({
          divingCylinderSetId: divingCylinderSet.id,
          payload: updatePayload,
        });
        closeModal();
      }}
    >
      {({ errors, handleSubmit }) => (
        <Modal
          isOpen={showModifyDivingCylinderModal}
          title="Muokkaa pullosettiä"
          onClose={() => {
            closeModal();
          }}
          onConfirm={handleSubmit}
        >
          <Form className="d-flex flex-column gap-2">
            <TextInput
              className="w-100"
              name="name"
              errorText={errors.name}
              label="Nimi"
              opIgnore
            />
            <TextInput
              className="w-100"
              name="inspectionYear"
              autoComplete="family-name"
              errorText={errors.inspectionYear}
              label="Katsastusvuosi"
              opIgnore
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
};
