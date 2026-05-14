import { useQueryClient } from '@tanstack/react-query';
import { useClubCylinderQuery } from '../../lib/queries/clubCylinderQuery';
import { CLUB_CYLINDER_SETS_QUERY_KEY } from '../../lib/queries/queryKeys';
import {
  useArchiveClubCylinderSetMutation,
  useCreateClubCylinderSet,
  usePatchClubCylinderSet,
} from '../../lib/queries/clubCylinderSetMutation';
import { ClubCylinderSetList } from '../../components/ClubCylinderSet/ClubCylinderSetList';
import { NewClubCylinderSet } from '../../components/ClubCylinderSet/NewClubCylinderSet';
import { useCallback, useState, type JSX } from 'react';

export const ClubCylinders = (): JSX.Element => {
  const queryClient = useQueryClient();

  const refetch = useCallback(
    () =>
      void queryClient.refetchQueries({ queryKey: CLUB_CYLINDER_SETS_QUERY_KEY }),
    [queryClient],
  );

  const { data: cylinderSets } = useClubCylinderQuery();
  const { mutate: archiveCylinder } = useArchiveClubCylinderSetMutation(refetch);
  const { mutate: patchCylinder } = usePatchClubCylinderSet(refetch);

  // Incrementing the key forces NewClubCylinderSet to remount, resetting the form.
  const [createKey, setCreateKey] = useState(0);
  const { mutate: createCylinder } = useCreateClubCylinderSet(() => {
    refetch();
    setCreateKey((k) => k + 1);
  });

  return (
    <div>
      <ClubCylinderSetList
        cylinderSets={cylinderSets ?? []}
        onArchive={archiveCylinder}
        onPatch={patchCylinder}
      />
      <NewClubCylinderSet
        key={createKey}
        onSubmit={createCylinder}
      />
    </div>
  );
};
