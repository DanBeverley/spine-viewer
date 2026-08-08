import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import events from "../../../events";
import { errorToast } from "../../../config/toastsConfig";
import { SavedSpineAsset } from "../../../interfaces";
import AssetLibraryService from "../../../services/AssetLibraryService";
import { useSpineViewerStore } from "../../../store";
import "./SavedAssetsDropdown.css";

interface SavedAssetsDropdownProps {
    accountId: string;
    onClose: () => void;
}

const SavedAssetsDropdown = ({ accountId, onClose }: SavedAssetsDropdownProps) => {
    const [assets, setAssets] = useState<SavedSpineAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [openingId, setOpeningId] = useState<string | null>(null);
    const { setLoadedFiles, setSuspendedFiles, setFilesLoading } = useSpineViewerStore(state => ({
        setLoadedFiles: state.setLoadedFiles,
        setSuspendedFiles: state.setSuspendedFiles,
        setFilesLoading: state.setFilesLoading
    }));

    useEffect(() => {
        AssetLibraryService.list(accountId)
            .then(setAssets)
            .catch(error => {
                toast(`Saved asset library unavailable: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            })
            .finally(() => setLoading(false));
    }, [accountId]);

    const openAsset = async (asset: SavedSpineAsset) => {
        const currentFiles = useSpineViewerStore.getState().loadedFiles;
        if (currentFiles.length > 0 && AssetLibraryService.getAssetKey(currentFiles) === asset.id) {
            onClose();
            return;
        }

        setOpeningId(asset.id);
        setFilesLoading(true);
        try {
            const loadedAsset = await AssetLibraryService.get(accountId, asset.id);
            if (!loadedAsset?.files.length) throw new Error("This saved Spine asset is missing or corrupted.");

            events.dispatchers.destroyPixiApp();
            setLoadedFiles(loadedAsset.files);
            setSuspendedFiles([]);
            setFilesLoading(false);
            onClose();
        } catch (error) {
            toast(`Could not open saved asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            setFilesLoading(false);
            setOpeningId(null);
        }
    };

    return (
        <div className="saved-assets-dropdown" role="menu" aria-label="Saved assets">
            <div className="saved-assets-dropdown__header">
                <span>Saved assets</span>
                <button type="button" onClick={onClose} aria-label="Close saved assets" title="Close">×</button>
            </div>
            {loading ? (
                <p className="saved-assets-dropdown__message">Loading…</p>
            ) : assets.length === 0 ? (
                <p className="saved-assets-dropdown__message">No saved assets yet.</p>
            ) : (
                <div className="saved-assets-dropdown__list">
                    {assets.map(asset => (
                        <button
                            type="button"
                            className="saved-assets-dropdown__item"
                            key={asset.id}
                            onClick={() => openAsset(asset)}
                            disabled={openingId !== null}
                            role="menuitem"
                        >
                            <span>{asset.name}</span>
                            <span aria-hidden="true">›</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedAssetsDropdown;
