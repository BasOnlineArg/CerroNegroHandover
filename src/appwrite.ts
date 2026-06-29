import { Client, Account, Databases, ID, Query, Models, OAuthProvider } from 'appwrite';

const client = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('6a3fc9620007a2238cc4');

export const account = new Account(client);
export const databases = new Databases(client);
export { client, ID, Query };

export type AppwriteUser = Models.User<Models.Preferences>;

export const DATABASE_ID = 'handover-db';

export const COLLECTIONS = {
  USERS: 'users',
  HANDOVERS: 'handovers',
  WHITELIST: 'whitelist',
  LOGS: 'logs',
} as const;

export const signInWithEmail = (email: string, password: string) =>
  account.createEmailPasswordSession(email, password);

export const registerWithEmail = async (email: string, password: string) => {
  try {
    await account.create(ID.unique(), email, password);
  } catch (err: any) {
    if (err.code !== 409) throw err;
  }
  return account.createEmailPasswordSession(email, password);
};

export const signInWithGoogle = () =>
  account.createOAuth2Session(
    OAuthProvider.Google,
    `${window.location.origin}/`,
    `${window.location.origin}/`
  );

export const logout = () => account.deleteSession('current');

export const getCurrentUser = () => account.get();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleAppwriteError(error: unknown, operationType: OperationType, path: string | null) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Appwrite Error [${operationType}] ${path}:`, msg);
  throw new Error(msg);
}
