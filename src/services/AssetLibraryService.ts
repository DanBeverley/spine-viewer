import { FileEntry, SavedSpineAsset } from "../interfaces";
import {
    ASSET_STORE_NAME,
    openSpineDatabase,
    StoredAsset
} from "./SpineDatabase";

const getAssetName = (files: FileEntry[]): string => {
    const primaryFile = files.find(file => file.type.toLowerCase() === "json")
        ?? files.find(file => file.type.toLowerCase() === "skel");

    if (!primaryFile) throw new Error("A Spine asset must include a JSON or SKEL file.");

    const filename = primaryFile.name.replace(/\\/g, "/").split("/").pop() ?? primaryFile.name;
    return filename.replace(/\.(json|skel)$/i, "") || "Untitled Spine";
};

const getAssetId = (files: FileEntry[]): string => getAssetName(files).trim().toLocaleLowerCase();
const getStorageKey = (ownerId: string, assetId: string) => `${ownerId}::${assetId}`;

const toPublicAsset = (asset: StoredAsset): SavedSpineAsset => ({
    id: asset.assetId,
    name: asset.name,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    files: asset.files
});

class AssetLibraryService {
    private static async getStored(ownerId: string, assetId: string): Promise<StoredAsset | undefined> {
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readonly");
            const request = transaction.objectStore(ASSET_STORE_NAME).get(getStorageKey(ownerId, assetId));
            request.onsuccess = () => {
                database.close();
                resolve(request.result as StoredAsset | undefined);
            };
            transaction.onerror = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to read the saved asset."));
            };
        });
    }

    public static async list(ownerId: string): Promise<SavedSpineAsset[]> {
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readonly");
            const request = transaction.objectStore(ASSET_STORE_NAME).getAll();
            request.onsuccess = () => {
                const assets = (request.result as StoredAsset[])
                    .filter(asset => asset.ownerId === ownerId)
                    .sort((left, right) => right.updatedAt - left.updatedAt)
                    .map(toPublicAsset);
                database.close();
                resolve(assets);
            };
            transaction.onerror = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to read the saved asset library."));
            };
        });
    }

    public static async get(ownerId: string, assetId: string): Promise<SavedSpineAsset | undefined> {
        const asset = await this.getStored(ownerId, assetId);
        return asset ? toPublicAsset(asset) : undefined;
    }

    public static async save(files: FileEntry[], ownerId: string, nameOverride?: string): Promise<SavedSpineAsset> {
        const assetId = getAssetId(files);
        const existing = await this.getStored(ownerId, assetId);
        const now = Date.now();
        const asset: StoredAsset = {
            id: getStorageKey(ownerId, assetId),
            assetId,
            ownerId,
            name: nameOverride?.trim() || getAssetName(files),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            files: files.map(file => ({ ...file }))
        };
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
            transaction.objectStore(ASSET_STORE_NAME).put(asset);
            transaction.oncomplete = () => { database.close(); resolve(toPublicAsset(asset)); };
            transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Unable to save this Spine asset.")); };
            transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Unable to save this Spine asset.")); };
        });
    }

    public static async rename(ownerId: string, assetId: string, name: string): Promise<void> {
        const asset = await this.getStored(ownerId, assetId);
        if (!asset) throw new Error("Saved asset not found.");
        asset.name = name.trim();
        asset.updatedAt = Date.now();
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
            transaction.objectStore(ASSET_STORE_NAME).put(asset);
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Unable to rename saved asset.")); };
        });
    }

    public static async delete(ownerId: string, assetId: string): Promise<void> {
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
            transaction.objectStore(ASSET_STORE_NAME).delete(getStorageKey(ownerId, assetId));
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Unable to delete this saved Spine asset.")); };
        });
    }

    public static async claimLegacyAssets(ownerId: string): Promise<void> {
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
            const store = transaction.objectStore(ASSET_STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                (request.result as Array<StoredAsset & { ownerId?: string }>).forEach(asset => {
                    if (asset.ownerId) return;
                    const assetId = asset.assetId ?? asset.id;
                    store.put({
                        ...asset,
                        id: getStorageKey(ownerId, assetId),
                        assetId,
                        ownerId,
                        updatedAt: asset.updatedAt ?? Date.now()
                    });
                    store.delete(asset.id);
                });
            };
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Unable to migrate saved assets.")); };
        });
    }
}

export default AssetLibraryService;
