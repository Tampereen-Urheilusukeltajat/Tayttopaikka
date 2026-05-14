import { type DivingCylinderSet } from '../../../interfaces/DivingCylinderSet';

import React, { useState } from 'react';
import styles from './FillingTile.module.scss';
import { type LogbookCommonTileProps } from './LogBookBasicInfoTile';
import FormCheckLabel from 'react-bootstrap/esm/FormCheckLabel';
import { FormCheck, Form } from 'react-bootstrap';
import { Field } from 'formik';

type AirLogbookFillingTileProps = LogbookCommonTileProps & {
  divingCylinderSets: DivingCylinderSet[];
  clubCylinderSets: DivingCylinderSet[];
};

export const LogbookFillingTile: React.FC<AirLogbookFillingTileProps> = ({
  divingCylinderSets,
  clubCylinderSets,
  errors,
  values,
}) => {
  const [showClubCylinders, setShowClubCylinders] = useState(false);

  const orderedCylinderSets = divingCylinderSets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const orderedClubCylinderSets = clubCylinderSets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return (
    <div className="pt-3 pb-3 border-bottom">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">Täytetyt pullosetit</h2>
        {orderedClubCylinderSets.length > 0 && (
          <Form.Check
            type="switch"
            id="show-club-cylinders"
            label="Näytä seuran pullot"
            checked={showClubCylinders}
            onChange={(e) => setShowClubCylinders(e.target.checked)}
            className={styles.clubCylinderSwitch}
          />
        )}
      </div>
      <span className="text-danger">{errors.divingCylinderSetIds}</span>

      <div
        className="d-flex flex-column flex-md-row gap-3"
        style={{ width: '100%' }}
      >
        <div
          className={`d-flex flex-column ${styles.fillingTile}`}
          style={{ flex: 1 }}
        >
          <h3>Omat pullot</h3>
          <div className="d-flex flex-column gap-2">
            {orderedCylinderSets.map((dcs) => (
              <FormCheck key={dcs.id} className={styles.cylinderCheckbox}>
                <Field
                  className="form-check-input"
                  disabled={values.userConfirm}
                  id={dcs.id}
                  name={'divingCylinderSetIds'}
                  type="checkbox"
                  value={dcs.id}
                />
                <FormCheckLabel htmlFor={dcs.id}>{dcs.name}</FormCheckLabel>
              </FormCheck>
            ))}
          </div>
        </div>
        {showClubCylinders && clubCylinderSets.length > 0 && (
          <div
            className={`d-flex flex-column ${styles.fillingTile}`}
            style={{ flex: 1 }}
          >
            <h3>Seuran pullot</h3>
            <div className="d-flex flex-column gap-2">
              {clubCylinderSets.map((dcs) => (
                <FormCheck key={dcs.id} className={styles.cylinderCheckbox}>
                  <Field
                    className="form-check-input"
                    disabled={values.userConfirm}
                    id={dcs.id}
                    name={'divingCylinderSetIds'}
                    type="checkbox"
                    value={dcs.id}
                  />
                  <FormCheckLabel htmlFor={dcs.id}>{dcs.name}</FormCheckLabel>
                </FormCheck>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
