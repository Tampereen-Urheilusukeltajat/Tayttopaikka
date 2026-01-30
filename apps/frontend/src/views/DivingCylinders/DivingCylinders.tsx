import { DivingCylinderSetList } from '../../components/DivingCylinderSet/DivingCylinderSetList';
import { NewDivingCylinderSet } from '../../components/DivingCylinderSet/NewDivingCylinderSet';

import type { JSX } from "react";

export const DivingCylinders = (): JSX.Element => {
  return (
    <div>
      <DivingCylinderSetList />
      <NewDivingCylinderSet />
    </div>
  );
};
