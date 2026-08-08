export const DATABASE_NAME = "spine-viewer";
export const DATABASE_VERSION = 2;
export const ASSET_STORE_NAME = "assetSets";
export const ACCOUNT_STORE_NAME = "accounts";
export const SESSION_STORE_NAME = "session";

export interface StoredAccount {
    id: string;
    username: string;
    salt: string;
    passwordHash: string;
    algorithm?: "pbkdf2" | "local-fallback";
    createdAt: number;
}

export interface StoredSession {
    id: "current";
    accountId: string;
}

export interface StoredAsset {
    id: string;
    assetId: string;
    ownerId: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    files: import("../interfaces").FileEntry[];
}

export const openSpineDatabase = (): Promise<IDBDatabase> => {
    if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB is not available in this browser."));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(ASSET_STORE_NAME)) {
                database.createObjectStore(ASSET_STORE_NAME, { keyPath: "id" });
            }
            if (!database.objectStoreNames.contains(ACCOUNT_STORE_NAME)) {
                database.createObjectStore(ACCOUNT_STORE_NAME, { keyPath: "id" });
            }
            if (!database.objectStoreNames.contains(SESSION_STORE_NAME)) {
                database.createObjectStore(SESSION_STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = () => {
            const database = request.result;
            database.onversionchange = () => database.close();
            resolve(database);
        };

        request.onerror = () => {
            reject(request.error ?? new Error("Unable to open the Spine Viewer database."));
        };
    });
};
