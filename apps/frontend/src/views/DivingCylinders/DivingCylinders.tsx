import { useQueryClient } from '@tanstack/react-query';
import { useDivingCylinderQuery } from '../../lib/queries/divingCylinderQuery';
import { DIVING_CYLINDER_SETS_QUERY_KEY } from '../../lib/queries/queryKeys';
import { getUserIdFromAccessToken } from '../../lib/utils';
import {
  useArchieveDivingCylinderSetMutation,
  useCreateDivingCylinderSet,
  usePatchDivingCylinderSet,
} from '../../lib/queries/divingCylinderSetMutation';
import { DivingCylinderSetList } from '../../components/DivingCylinderSet/DivingCylinderSetList';
import { NewDivingCylinderSet } from '../../components/DivingCylinderSet/NewDivingCylinderSet';
import { useCallback, useMemo, useState, type JSX } from 'react';

export const DivingCylinders = (): JSX.Element => {
  const userId = useMemo(() => getUserIdFromAccessToken(), []);
  const queryClient = useQueryClient();

  const refetch = useCallback(
    () =>
      void queryClient.refetchQueries({
        queryKey: DIVING_CYLINDER_SETS_QUERY_KEY(userId),
      }),
    [queryClient, userId],
  );

  const { data: cylinderSets } = useDivingCylinderQuery(userId);
  const { mutate: archiveCylinder } = useArchieveDivingCylinderSetMutation(
    userId,
    refetch,
  );
  const { mutate: patchCylinder } = usePatchDivingCylinderSet(userId, refetch);

  const [createKey, setCreateKey] = useState(0);
  const { mutate: createCylinder } = useCreateDivingCylinderSet(userId, () => {
    refetch();
    setCreateKey((k) => k + 1);
  });

  return (
    <div>
      <DivingCylinderSetList
        cylinderSets={cylinderSets ?? []}
        onArchive={archiveCylinder}
        onPatch={patchCylinder}
        userId={userId}
      />
      <NewDivingCylinderSet
        key={createKey}
        onSubmit={(payload) =>
          createCylinder({ ...payload, owner: userId })
        }
      />
    </div>
  );
};
