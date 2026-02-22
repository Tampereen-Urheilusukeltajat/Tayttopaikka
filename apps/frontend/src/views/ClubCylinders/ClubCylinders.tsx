import { ClubCylinderSetList } from '../../components/ClubCylinderSet/ClubCylinderSetList';
import { NewClubCylinderSet } from '../../components/ClubCylinderSet/NewClubCylinderSet';

import type { JSX } from 'react';

export const ClubCylinders = (): JSX.Element => {
  return (
    <div>
      <ClubCylinderSetList />
      <NewClubCylinderSet />
    </div>
  );
};
