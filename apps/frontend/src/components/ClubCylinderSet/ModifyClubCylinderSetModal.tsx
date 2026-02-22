import React from 'react';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';
import { Formik } from 'formik';
import { Modal } from '../common/Modal/Modal';
import { Form } from 'react-bootstrap';
import { TextInput } from '../common/Inputs';
import { format } from 'date-fns';
import { usePatchClubCylinderSet } from '../../lib/queries/clubCylinderSetMutation';
import { CLUB_CYLINDER_SETS_QUERY_KEY } from '../../lib/queries/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { PATCH_DIVING_CYLINDER_SET_VALIDATION_SCHEMA } from '../DivingCylinderSet/validation';

type ModifyClubCylinderSetModalProps = {
  clubCylinderSet: DivingCylinderSet;
  showModifyClubCylinderModal: boolean;
  closeModal: () => void;
};

export const ModifyClubCylinderSetModal: React.FC<
  ModifyClubCylinderSetModalProps
> = ({ clubCylinderSet, showModifyClubCylinderModal, closeModal }) => {
  const queryClient = useQueryClient();
  const { mutate: patchClubCylinderSet } = usePatchClubCylinderSet(() => {
    void queryClient.refetchQueries({
      queryKey: CLUB_CYLINDER_SETS_QUERY_KEY,
    });
    closeModal();
  });

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

        patchClubCylinderSet({
          divingCylinderSetId: clubCylinderSet.id,
          payload: updatePayload,
        });
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
