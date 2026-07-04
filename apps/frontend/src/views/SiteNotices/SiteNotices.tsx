import React, { useCallback, useState } from 'react';
import { Badge, Button, Form, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import { Formik, Form as FormikForm } from 'formik';
import * as yup from 'yup';
import { useAdminNoticesQuery } from '../../lib/queries/noticeQuery';
import {
  useCreateNoticeMutation,
  useDeleteNoticeMutation,
  useUpdateNoticeMutation,
} from '../../lib/queries/noticeMutations';
import { type SiteNoticeWithPoster } from '../../interfaces/SiteNotice';
import { Modal } from '../../components/common/Modal/Modal';
import { FIELD_REQUIRED } from '../../lib/validationUtils';

type CreateFormValues = {
  message: string;
  showLogbook: boolean;
  showBlenderLogbook: boolean;
  activeFrom: string;
  activeTo: string;
};

const VALIDATION_SCHEMA = yup.object().shape({
  message: yup.string().required(FIELD_REQUIRED).max(2000),
  showLogbook: yup.boolean(),
  showBlenderLogbook: yup.boolean(),
  activeFrom: yup.string().required(FIELD_REQUIRED),
  activeTo: yup.string(),
});

const isActive = (notice: SiteNoticeWithPoster): boolean => {
  const now = new Date();
  const from = new Date(notice.activeFrom);
  if (from > now) return false;
  if (notice.activeTo === null) return true;
  return new Date(notice.activeTo) > now;
};

const formatDate = (iso: string): string =>
  format(new Date(iso), 'dd.MM.yyyy');

const getTodayDateString = (): string => new Date().toLocaleDateString('sv-SE');

export const SiteNotices: React.FC = () => {
  const { data: notices, isLoading } = useAdminNoticesQuery();
  const [deletingNotice, setDeletingNotice] = useState<SiteNoticeWithPoster | null>(null);

  const { mutate: doCreate, isPending: isCreating } = useCreateNoticeMutation(
    () => undefined,
  );
  const { mutate: doUpdate } = useUpdateNoticeMutation();
  const { mutate: doDelete, isPending: isDeleting } = useDeleteNoticeMutation(
    () => setDeletingNotice(null),
  );

  const handleDeactivate = useCallback(
    (notice: SiteNoticeWithPoster) => {
      doUpdate({
        id: notice.id,
        payload: { activeTo: new Date().toISOString() },
      });
    },
    [doUpdate],
  );

  const handleSubmit = useCallback(
    (values: CreateFormValues, { resetForm }: { resetForm: () => void }) => {
      doCreate(
        {
          message: values.message,
          showLogbook: values.showLogbook,
          showBlenderLogbook: values.showBlenderLogbook,
          activeFrom: `${values.activeFrom}T00:00:00Z`,
          activeTo: values.activeTo ? `${values.activeTo}T00:00:00Z` : null,
        },
        { onSuccess: resetForm },
      );
    },
    [doCreate],
  );

  if (isLoading) return null;

  return (
    <div>
      <h2>Ilmoitukset</h2>

      <h3 className="h5 mt-4">Uusi ilmoitus</h3>
      <Formik
        initialValues={{
          message: '',
          showLogbook: false,
          showBlenderLogbook: false,
          activeFrom: getTodayDateString(),
          activeTo: '',
        }}
        validationSchema={VALIDATION_SCHEMA}
        onSubmit={handleSubmit}
      >
        {({ values, errors, handleChange, handleBlur }) => (
          <FormikForm>
            <Form.Group className="mb-3">
              <Form.Label>Viesti</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="message"
                value={values.message}
                onChange={handleChange}
                onBlur={handleBlur}
                isInvalid={!!errors.message}
              />
              <Form.Control.Feedback type="invalid">
                {errors.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Näytä näkymässä</Form.Label>
              <div>
                <Form.Check
                  type="checkbox"
                  id="showLogbook"
                  name="showLogbook"
                  label="Paineilmatäyttö"
                  checked={values.showLogbook}
                  onChange={handleChange}
                />
                <Form.Check
                  type="checkbox"
                  id="showBlenderLogbook"
                  name="showBlenderLogbook"
                  label="Happihäkki"
                  checked={values.showBlenderLogbook}
                  onChange={handleChange}
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Voimassa alkaen</Form.Label>
              <Form.Control
                type="date"
                name="activeFrom"
                value={values.activeFrom}
                onChange={handleChange}
                onBlur={handleBlur}
                isInvalid={!!errors.activeFrom}
              />
              <Form.Control.Feedback type="invalid">
                {errors.activeFrom}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Voimassa asti (tyhjä = toistaiseksi)</Form.Label>
              <Form.Control
                type="date"
                name="activeTo"
                value={values.activeTo}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </Form.Group>

            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Luodaan...' : 'Luo ilmoitus'}
            </Button>
          </FormikForm>
        )}
      </Formik>

      <h3 className="h5 mt-5">Kaikki ilmoitukset</h3>
      {(notices ?? []).length === 0 ? (
        <p className="text-muted">Ei ilmoituksia.</p>
      ) : (
        <Table responsive hover>
          <thead>
            <tr>
              <th>Viesti</th>
              <th>Tila</th>
              <th>Näkymät</th>
              <th>Voimassa alkaen</th>
              <th>Voimassa asti</th>
              <th>Luonut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(notices ?? []).map((notice) => (
              <tr key={notice.id}>
                <td>{notice.message}</td>
                <td>
                  {isActive(notice) ? (
                    <Badge bg="success">Aktiivinen</Badge>
                  ) : (
                    <Badge bg="secondary">Päättynyt</Badge>
                  )}
                </td>
                <td>
                  {notice.showLogbook && (
                    <Badge bg="info" text="dark" className="me-1">
                      Paineilmatäyttö
                    </Badge>
                  )}
                  {notice.showBlenderLogbook && (
                    <Badge bg="info" text="dark">
                      Happihäkki
                    </Badge>
                  )}
                </td>
                <td>{formatDate(notice.activeFrom)}</td>
                <td>{notice.activeTo ? formatDate(notice.activeTo) : '—'}</td>
                <td>{notice.posterName}</td>
                <td className="d-flex gap-2">
                  {isActive(notice) && (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => handleDeactivate(notice)}
                    >
                      Päätä nyt
                    </Button>
                  )}
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setDeletingNotice(notice)}
                  >
                    Poista
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {deletingNotice !== null && (
        <Modal
          isOpen
          title="Poista ilmoitus"
          confirmButtonText={isDeleting ? 'Poistetaan...' : 'Poista'}
          onConfirm={() => doDelete(deletingNotice.id)}
          onClose={() => setDeletingNotice(null)}
        >
          <p>
            Olet poistamassa ilmoituksen:{' '}
            <strong>{deletingNotice.message}</strong>
          </p>
          <p>Toimintoa ei voi peruuttaa.</p>
        </Modal>
      )}
    </div>
  );
};
