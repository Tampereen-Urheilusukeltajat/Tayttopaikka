import React from 'react';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';
import { Formik } from 'formik';
import { Modal } from '../common/Modal/Modal';
import { Form } from 'react-bootstrap';
import { TextInput } from '../common/Inputs';
import { format } from 'date-fns';
import { type PatchClubCylinderSetPayload } from '../../lib/apiRequests/clubCylinderSetRequests';
import { PATCH_DIVING_CYLINDER_SET_VALIDATION_SCHEMA } from '../CylinderSet/validation';

type PatchArgs = {
  divingCylinderSetId: string;
  payload: PatchClubCylinderSetPayload;
};

type ModifyClubCylinderSetModalProps = {
  clubCylinderSet: DivingCylinderSet;
  showModifyClubCylinderModal: boolean;
  closeModal: () => void;
  onPatch: (args: PatchArgs) => void;
};

export const ModifyClubCylinderSetModal: React.FC<
  ModifyClubCylinderSetModalProps
> = ({ clubCylinderSet, showModifyClubCylinderModal, closeModal, onPatch }) => {

  return (
    <Formik
      initialValues={{
        name: clubCylinderSet.name,
        inspectionYear: format(clubCylinderSet.cylinders[0].inspection, 'yyyy'),
      }}
      validationSchema={PATCH_DIVING_CYLINDER_SET_VALIDATION_SCHEMA}
      onSubmit={(values) => {
        const updatePayload = {
          name: values.name,
          cylinders: clubCylinderSet.cylinders.map((dc) => ({
            id: dc.id,
            inspection: format(values.inspectionYear, 'yyyy-MM-dd'),
          })),
        };

        onPatch({
          divingCylinderSetId: clubCylinderSet.id,
          payload: updatePayload,
        });
        closeModal();
      }}
    >
      {({ errors, handleSubmit }) => (
        <Modal
          isOpen={showModifyClubCylinderModal}
          title="Muokkaa seuran pullosettiä"
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
