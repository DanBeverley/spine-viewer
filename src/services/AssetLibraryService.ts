import { FileEntry, SavedSpineAsset } from "../interfaces";
import { requireSupabase } from "./supabaseClient";

const BUCKET_NAME = "spine-assets";

interface StoredFileMetadata {
    type: string;
    name: string;
    path: string | undefined;
    storagePath: string;
}

interface StoredAssetRow {
    id: string;
    owner_id: string;
    asset_key: string;
    name: string;
    files: StoredFileMetadata[];
    created_at: string;
    updated_at: string;
}

interface LegacyLocalAsset {
    id: string;
    name: string;
    files: FileEntry[];
}

const getFolderName = (file: FileEntry): string | undefined => {
    if (!file.path) return undefined;

    const segments = file.path.replace(/\\/g, "/").split("/").filter(Boolean);
    if (segments.length < 2) return undefined;

    const folderName = segments[segments.length - 2].trim();
    if (!folderName || folderName.toLowerCase() === "fakepath") return undefined;
    return folderName;
};

const getAssetName = (files: FileEntry[]): string => {
    const primaryFile = files.find(file => file.type.toLowerCase() === "json")
        ?? files.find(file => file.type.toLowerCase() === "skel");

    if (!primaryFile) throw new Error("A Spine asset must include a JSON or SKEL file.");

    // react-dropzone preserves the relative folder path for directory/batch
    // uploads. Prefer that folder as the library name, while retaining the
    // file-based fallback for normal file-picker uploads.
    const folderName = getFolderName(primaryFile) ?? files.map(getFolderName).find(Boolean);
    if (folderName) return folderName;

    const filename = primaryFile.name.replace(/\\/g, "/").split("/").pop() ?? primaryFile.name;
    return filename.replace(/\.(json|skel)$/i, "") || "Untitled Spine";
};

const getAssetKey = (files: FileEntry[]) => getAssetName(files).trim().toLocaleLowerCase();
const getStoragePath = (ownerId: string, assetKey: string, index: number, name: string) => {
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${ownerId}/${assetKey}/${index}-${safeName}`;
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) throw new Error("Invalid image data URL.");

    const mimeType = match[1] || "application/octet-stream";
    const body = match[3];
    if (!match[2]) return new Blob([decodeURIComponent(body)], { type: mimeType });

    const binary = atob(body);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new Blob([bytes], { type: mimeType });
};

const fileEntryToBlob = async (file: FileEntry): Promise<Blob> => {
    if (typeof file.data === "string") {
        if (file.data.startsWith("data:")) return dataUrlToBlob(file.data);
        return new Blob([file.data], { type: "text/plain;charset=utf-8" });
    }
    if (file.data instanceof ArrayBuffer) return new Blob([new Uint8Array(file.data)]);
    throw new Error(`File data is missing for ${file.name}.`);
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Unable to reconstruct saved image data."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read saved image data."));
    reader.readAsDataURL(blob);
});

const blobToFileEntryData = async (file: StoredFileMetadata, blob: Blob): Promise<string | ArrayBuffer> => {
    const type = file.type.toLowerCase();
    if (["json", "atlas"].includes(type)) return blob.text();
    // Pixi's existing upload path supplies images as data URLs. Recreate the
    // same shape when downloading from Storage; SKEL remains binary.
    if (["png", "jpg", "webp"].includes(type)) return blobToDataUrl(blob);
    return blob.arrayBuffer();
};

const toPublicAsset = (row: StoredAssetRow, files: FileEntry[]): SavedSpineAsset => ({
    id: row.asset_key,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    files
});

class AssetLibraryService {
    private static async readLegacyLocalAssets(): Promise<LegacyLocalAsset[]> {
        if (typeof indexedDB === "undefined") return [];

        return new Promise((resolve, reject) => {
            const request = indexedDB.open("spine-viewer");
            request.onsuccess = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains("assetSets")) {
                    database.close();
                    resolve([]);
                    return;
                }

                const transaction = database.transaction("assetSets", "readonly");
                const assetsRequest = transaction.objectStore("assetSets").getAll();
                assetsRequest.onsuccess = () => {
                    database.close();
                    resolve((assetsRequest.result as LegacyLocalAsset[]).filter(asset => asset.files?.length > 0));
                };
                transaction.onerror = () => {
                    database.close();
                    reject(transaction.error ?? new Error("Unable to read local saved assets."));
                };
            };
            request.onerror = () => reject(request.error ?? new Error("Unable to read local saved assets."));
        });
    }

    private static async removeLegacyLocalAssets(ids: string[]): Promise<void> {
        if (ids.length === 0 || typeof indexedDB === "undefined") return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open("spine-viewer");
            request.onsuccess = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains("assetSets")) {
                    database.close();
                    resolve();
                    return;
                }
                const transaction = database.transaction("assetSets", "readwrite");
                const store = transaction.objectStore("assetSets");
                ids.forEach(id => store.delete(id));
                transaction.oncomplete = () => { database.close(); resolve(); };
                transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Unable to remove migrated local assets.")); };
            };
            request.onerror = () => reject(request.error ?? new Error("Unable to remove migrated local assets."));
        });
    }

    private static async getRow(ownerId: string, assetKey: string): Promise<StoredAssetRow | null> {
        const client = requireSupabase();
        const { data, error } = await client
            .from("spine_assets")
            .select("id, owner_id, asset_key, name, files, created_at, updated_at")
            .eq("owner_id", ownerId)
            .eq("asset_key", assetKey)
            .maybeSingle();
        if (error) throw error;
        return data as StoredAssetRow | null;
    }

    private static async downloadFiles(row: StoredAssetRow): Promise<FileEntry[]> {
        const client = requireSupabase();
        return Promise.all(row.files.map(async file => {
            const { data, error } = await client.storage.from(BUCKET_NAME).download(file.storagePath);
            if (error) throw error;
            return {
                type: file.type,
                name: file.name,
                path: file.path,
                data: await blobToFileEntryData(file, data)
            };
        }));
    }

    public static async list(ownerId: string): Promise<SavedSpineAsset[]> {
        const client = requireSupabase();
        const { data, error } = await client
            .from("spine_assets")
            .select("id, owner_id, asset_key, name, files, created_at, updated_at")
            .eq("owner_id", ownerId)
            .order("updated_at", { ascending: false });
        if (error) throw error;
        return (data as StoredAssetRow[]).map(row => toPublicAsset(row, []));
    }

    public static async get(ownerId: string, assetKey: string): Promise<SavedSpineAsset | undefined> {
        const row = await this.getRow(ownerId, assetKey);
        if (!row) return undefined;
        return toPublicAsset(row, await this.downloadFiles(row));
    }

    public static async save(files: FileEntry[], ownerId: string, nameOverride?: string): Promise<SavedSpineAsset> {
        const client = requireSupabase();
        const assetKey = getAssetKey(files);
        const existing = await this.getRow(ownerId, assetKey);
        const metadata: StoredFileMetadata[] = [];

        for (const [index, file] of files.entries()) {
            const storagePath = getStoragePath(ownerId, assetKey, index, file.name);
            try {
                const { error } = await client.storage.from(BUCKET_NAME).upload(storagePath, await fileEntryToBlob(file), {
                    upsert: true,
                    ...(file.type === "json" || file.type === "atlas" ? { contentType: "text/plain" } : {})
                });
                if (error) throw error;
            } catch (error) {
                throw new Error(`Could not upload ${file.name}: ${error instanceof Error ? error.message : "unknown storage error"}`);
            }
            metadata.push({ type: file.type, name: file.name, path: file.path, storagePath });
        }

        const { data, error } = await client
            .from("spine_assets")
            .upsert({
                owner_id: ownerId,
                asset_key: assetKey,
                name: nameOverride?.trim() || getAssetName(files),
                files: metadata
            }, { onConflict: "owner_id,asset_key" })
            .select("id, owner_id, asset_key, name, files, created_at, updated_at")
            .single();
        if (error) throw new Error(`Files uploaded, but asset metadata could not be saved: ${error.message}`);

        const oldPaths = (existing?.files ?? []).map(file => file.storagePath)
            .filter(path => !metadata.some(file => file.storagePath === path));
        if (oldPaths.length > 0) await client.storage.from(BUCKET_NAME).remove(oldPaths);

        return toPublicAsset(data as StoredAssetRow, files);
    }

    public static async rename(ownerId: string, assetKey: string, name: string): Promise<void> {
        const client = requireSupabase();
        const { error } = await client
            .from("spine_assets")
            .update({ name: name.trim(), updated_at: new Date().toISOString() })
            .eq("owner_id", ownerId)
            .eq("asset_key", assetKey);
        if (error) throw error;
    }

    public static async delete(ownerId: string, assetKey: string): Promise<void> {
        const client = requireSupabase();
        const row = await this.getRow(ownerId, assetKey);
        if (!row) return;
        const { error } = await client.from("spine_assets").delete().eq("owner_id", ownerId).eq("asset_key", assetKey);
        if (error) throw error;
        const { error: storageError } = await client.storage.from(BUCKET_NAME).remove(row.files.map(file => file.storagePath));
        if (storageError) throw storageError;
    }

    public static async migrateLocalAssets(ownerId: string): Promise<void> {
        const localAssets = await this.readLegacyLocalAssets();
        const migratedIds: string[] = [];

        for (const asset of localAssets) {
            await this.save(asset.files, ownerId, asset.name);
            migratedIds.push(asset.id);
        }

        await this.removeLegacyLocalAssets(migratedIds);
    }
}

export default AssetLibraryService;
