import { FileEntry, SavedSpineAsset } from "../interfaces";

const DATABASE_NAME = "spine-viewer";
const DATABASE_VERSION = 1;
const ASSET_STORE_NAME = "assetSets";

const getAssetName = (files: FileEntry[]): string => {
    const primaryFile = files.find(file => file.type.toLowerCase() === "json")
        ?? files.find(file => file.type.toLowerCase() === "skel");

    if (!primaryFile) {
        throw new Error("A Spine asset must include a JSON or SKEL file.");
    }

    const filename = primaryFile.name.replace(/\\/g, "/").split("/").pop() ?? primaryFile.name;
    return filename.replace(/\.(json|skel)$/i, "") || "Untitled Spine";
};

const getAssetId = (name: string): string => name.trim().toLocaleLowerCase();

class AssetLibraryService {
    private static openDatabase(): Promise<IDBDatabase> {
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
            };

            request.onsuccess = () => {
                const database = request.result;
                database.onversionchange = () => database.close();
                resolve(database);
            };

            request.onerror = () => {
                reject(request.error ?? new Error("Unable to open the saved Spine asset library."));
            };
        });
    }

    public static async list(): Promise<SavedSpineAsset[]> {
        const database = await this.openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readonly");
            const request = transaction.objectStore(ASSET_STORE_NAME).getAll();

            request.onsuccess = () => {
                const assets = (request.result as SavedSpineAsset[])
                    .sort((left, right) => right.updatedAt - left.updatedAt);
                database.close();
                resolve(assets);
            };

            transaction.onerror = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to read the saved Spine asset library."));
            };
        });
    }

    public static async get(id: string): Promise<SavedSpineAsset | undefined> {
        const database = await this.openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readonly");
            const request = transaction.objectStore(ASSET_STORE_NAME).get(id);

            request.onsuccess = () => {
                database.close();
                resolve(request.result as SavedSpineAsset | undefined);
            };

            transaction.onerror = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to open the saved Spine asset."));
            };
        });
    }

    public static async save(files: FileEntry[]): Promise<SavedSpineAsset> {
        const name = getAssetName(files);
        const id = getAssetId(name);
        const existing = await this.get(id);

        const now = Date.now();
        const asset: SavedSpineAsset = {
            id,
            name,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            files: files.map(file => ({ ...file }))
        };

        const writeDatabase = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = writeDatabase.transaction(ASSET_STORE_NAME, "readwrite");
            transaction.objectStore(ASSET_STORE_NAME).put(asset);

            transaction.oncomplete = () => {
                writeDatabase.close();
                resolve(asset);
            };

            transaction.onerror = () => {
                writeDatabase.close();
                reject(transaction.error ?? new Error("Unable to save this Spine asset."));
            };

            transaction.onabort = () => {
                writeDatabase.close();
                reject(transaction.error ?? new Error("Unable to save this Spine asset."));
            };
        });
    }

    public static async delete(id: string): Promise<void> {
        const database = await this.openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
            transaction.objectStore(ASSET_STORE_NAME).delete(id);

            transaction.oncomplete = () => {
                database.close();
                resolve();
            };

            transaction.onerror = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to delete this saved Spine asset."));
            };

            transaction.onabort = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to delete this saved Spine asset."));
            };
        });
    }
}

export default AssetLibraryService;
