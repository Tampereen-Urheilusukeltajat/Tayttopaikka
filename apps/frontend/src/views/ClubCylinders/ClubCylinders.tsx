import { ClubCylinderSetList } from '../../components/ClubCylinderSet/ClubCylinderSetList';
import { NewClubCylinderSet } from '../../components/ClubCylinderSet/NewClubCylinderSet';

import type { JSX } from 'react';

export const ClubCylinders = (): JSX.Element => {
  return (
    <div>
      <h1 className="pb-4">Seuran pullot</h1>
      <ClubCylinderSetList />
      <NewClubCylinderSet />
    </div>
  );
};
