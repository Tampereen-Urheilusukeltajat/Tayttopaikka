import { type UserRoles } from './apiRequests/userRequests';
import { type AccessToken } from './auth';

export enum AvailableGasses {
  air = 'Air',
  argon = 'Argon',
  diluent = 'Diluent',
  helium = 'Helium',
  oxygen = 'Oxygen',
}

export enum AvailableMixtures {
  Nitrox = 'Nitrox',
  Trimix = 'Trimix',
  Argon = 'Argon',
  Oxygen = 'Oxygen',
}

export const AvailableMixtureCompositions = [
  {
    id: AvailableMixtures.Nitrox,
    components: [AvailableGasses.oxygen],
  },
  {
    id: AvailableMixtures.Trimix,
    components: [AvailableGasses.oxygen, AvailableGasses.helium],
  },
  {
    id: AvailableMixtures.Argon,
    components: [AvailableGasses.argon],
    fixedComposition: { oxygenPercentage: '0', heliumPercentage: '0' },
  },
  {
    id: AvailableMixtures.Oxygen,
    components: [AvailableGasses.oxygen],
    fixedComposition: { oxygenPercentage: '100', heliumPercentage: '0' },
  },
];

/** Display label for the gas mixture dropdown. */
export const mapMixtureToLabel = (mixture: AvailableMixtures): string => {
  switch (mixture) {
    case AvailableMixtures.Oxygen:
      return 'Happi';
    default:
      return mixture;
  }
};

/** Storage cylinder gas content allowed for each mixture in the main filling tile. */
export const AvailableMixtureAllowedGasses: Record<
  AvailableMixtures,
  AvailableGasses[]
> = {
  [AvailableMixtures.Nitrox]: [AvailableGasses.oxygen],
  [AvailableMixtures.Oxygen]: [AvailableGasses.oxygen],
  [AvailableMixtures.Argon]: [AvailableGasses.argon],
  [AvailableMixtures.Trimix]: [AvailableGasses.oxygen, AvailableGasses.helium],
};

export const formalizeGasMixture = (
  gasMixture: AvailableMixtures,
  oxygenPercentage: string,
  heliumPercentage: string,
): string => {
  switch (gasMixture) {
    case AvailableMixtures.Argon:
      return 'Argon';
    case AvailableMixtures.Oxygen:
      return 'O2 100%';
    case AvailableMixtures.Nitrox:
      return `EAN${oxygenPercentage}`;
    case AvailableMixtures.Trimix:
      return `Trimix ${oxygenPercentage}/${heliumPercentage}`;
  }
};

export const mapGasToName = (gas?: AvailableGasses): string => {
  switch (gas) {
    case AvailableGasses.air:
      return 'Ilma';
    case AvailableGasses.argon:
      return 'Argon';
    case AvailableGasses.diluent:
      return 'Diluentti';
    case AvailableGasses.helium:
      return 'Helium';
    case AvailableGasses.oxygen:
      return 'Happi';
    default:
      throw new Error('Unknown gas met!');
  }
};

export const tokenExpired = (exp: number): boolean =>
  // Date now gives timestamp in ms, token has seconds
  Math.floor(Date.now() / 1000) > exp;

type TokenPayload<Payload> = {
  token: string;
  payload: Payload;
};

export const getTokenFromLocalStorage = <Payload>(
  tokenName: string,
): TokenPayload<Payload> | undefined => {
  const token = localStorage.getItem(tokenName) ?? '';
  const splittedToken = token.split('.');

  // Valid tokens always have three parts
  if (splittedToken.length !== 3) return undefined;

  const base64 = splittedToken[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const payload: Payload = JSON.parse(new TextDecoder().decode(bytes));

  return {
    token,
    payload,
  };
};

/**
 * @returns UserId
 * @throws If accessToken is not found (shouldn't happen)
 */
export const getUserIdFromAccessToken = (): string => {
  const token = getTokenFromLocalStorage<AccessToken>('accessToken');
  if (!token) throw new Error('accessToken not found');

  return token.payload.id;
};

/**
 * Gets changed values from two similar objects
 * @returns changed values
 */
export const getChangedFieldValues = (
  initialValues: Record<string, unknown>,
  changedFields: Record<string, unknown>,
): Record<string, unknown> => {
  const changedKeys = Object.keys(initialValues).filter((key) => {
    return initialValues[key] !== changedFields[key];
  });

  return changedKeys.reduce(
    (previousValue, currentValue) => ({
      ...previousValue,
      [currentValue]: changedFields[currentValue],
    }),
    {},
  );
};

/**
 * Get users full name stored inside the token
 * @returns full name (string)
 */
export const getUserFullName = (): string => {
  const token = getTokenFromLocalStorage<AccessToken>('accessToken');
  if (!token) throw new Error('accessToken not found');

  return token.payload.fullName;
};

/**
 * @returns User roles
 * @throws If accessToken is not found (shouldn't happen)
 */
export const getUserRoles = (): UserRoles => {
  const token = getTokenFromLocalStorage<AccessToken>('accessToken');
  if (!token) throw new Error('accessToken not found');

  const { isAdmin, isBlender, isUser, isAdvancedBlender, isInstructor } =
    token.payload;

  return {
    isAdmin,
    isBlender,
    isUser,
    isAdvancedBlender,
    isInstructor,
  };
};
