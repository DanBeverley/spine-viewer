import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import events from "../../events";
import { errorToast } from "../../config/toastsConfig";
import { FileEntry, SavedSpineAsset } from "../../interfaces";
import AssetLibraryService from "../../services/AssetLibraryService";
import { useSpineViewerStore } from "../../store";
import DropZone from "./DropZone";
import SpineLoaderInfoText from "./SpineLoaderInfoText";
import "./SpineLoader.css";

interface SpineLoaderProps {
    accountId: string;
    hasCurrentAnimation: boolean;
}

type IconName = "open" | "edit" | "trash" | "check" | "close";

const Icon = ({ name }: { name: IconName }) => {
    const paths: Record<IconName, JSX.Element> = {
        open: <><path d="M4 12h13" /><path d="m12 7 5 5-5 5" /></>,
        edit: <><path d="m4 16.5-.7 3.2 3.2-.7L18 7.5 16.5 6 4 16.5Z" /><path d="m14.8 7.7 1.5 1.5M16.5 6l1-1a1.4 1.4 0 0 1 2 2l-1 1" /></>,
        trash: <><path d="M5 7h14M10 11v5M14 11v5" /><path d="M8 7l1-3h6l1 3M7 7l1 13h8l1-13" /></>,
        check: <path d="m5 12 4 4L19 6" />,
        close: <><path d="m6 6 12 12M18 6 6 18" /></>
    };

    return (
        <svg className="saved-asset__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {paths[name]}
        </svg>
    );
};

const SpineLoader = ({ accountId, hasCurrentAnimation }: SpineLoaderProps) => {
    const [savedAssets, setSavedAssets] = useState<SavedSpineAsset[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [assetName, setAssetName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    const { suspendedFiles, setLoadedFiles, setSuspendedFiles, setFilesLoading, setAssetLibraryOpen } = useSpineViewerStore(state => ({
        suspendedFiles: state.suspendedFiles,
        setLoadedFiles: state.setLoadedFiles,
        setSuspendedFiles: state.setSuspendedFiles,
        setFilesLoading: state.setFilesLoading,
        setAssetLibraryOpen: state.setAssetLibraryOpen
    }));

    const refreshSavedAssets = () => {
        AssetLibraryService.list(accountId)
            .then(setSavedAssets)
            .catch(error => {
                toast(`Saved asset library unavailable: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    };

    useEffect(() => {
        AssetLibraryService.migrateLocalAssets(accountId)
            .then(refreshSavedAssets)
            .catch(error => {
                toast(`Local asset migration unavailable: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    }, [accountId]);

    const loadFiles = (files: FileEntry[]) => {
        events.dispatchers.destroyPixiApp();
        setLoadedFiles(files);
        setSuspendedFiles([]);
        setFilesLoading(false);
        setAssetLibraryOpen(false);
    };

    const onFilesLoaded = (files: FileEntry[]) => {
        loadFiles(files);
        const requestedName = assetName.trim() || undefined;
        setAssetName("");

        AssetLibraryService.save(files, accountId, requestedName)
            .then(refreshSavedAssets)
            .catch(error => {
                toast(`Could not save this Spine asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    };

    const onStartLoadingFiles = () => setFilesLoading(true);

    const onLoadError = (message: string) => {
        toast(message, errorToast);
        setFilesLoading(false);
    };

    const handleOpenSavedAsset = (id: string) => {
        setFilesLoading(true);
        AssetLibraryService.get(accountId, id)
            .then(asset => {
                if (!asset || !asset.files.length) {
                    throw new Error("This saved Spine asset is missing or corrupted.");
                }

                loadFiles(asset.files);
            })
            .catch(error => {
                toast(`Could not open saved asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
                setFilesLoading(false);
            });
    };

    const handleDeleteSavedAsset = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();

        AssetLibraryService.delete(accountId, id)
            .then(refreshSavedAssets)
            .catch(error => {
                toast(`Could not delete saved asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    };

    const beginEditing = (asset: SavedSpineAsset) => {
        setEditingId(asset.id);
        setEditingName(asset.name);
    };

    const saveEditedName = (id: string) => {
        const nextName = editingName.trim();
        if (!nextName) return;

        AssetLibraryService.rename(accountId, id, nextName)
            .then(() => {
                setEditingId(null);
                refreshSavedAssets();
            })
            .catch(error => {
                toast(`Could not rename saved asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    };

    return (
        <main className="spine-loader">
            <div className="spine-loader__toolbar">
                {(hasCurrentAnimation || suspendedFiles.length > 0) && (
                    <button
                        type="button"
                        className="spine-loader__return-button"
                        onClick={() => {
                            if (suspendedFiles.length > 0) {
                                setLoadedFiles(suspendedFiles);
                                setSuspendedFiles([]);
                            }
                            setAssetLibraryOpen(false);
                        }}
                    >
                        Return to current animation
                    </button>
                )}
                {!showUpload && (
                    <button type="button" className="spine-loader__upload-button" onClick={() => setShowUpload(true)}>
                        Upload new Spine
                    </button>
                )}
            </div>

            <section className="saved-assets" aria-labelledby="saved-assets-heading">
                <h2 id="saved-assets-heading">Saved assets</h2>
                {savedAssets.length === 0 ? (
                    <p className="saved-assets__empty">No saved assets yet.</p>
                ) : (
                    <div className="saved-assets__list">
                        {savedAssets.map(asset => (
                            <div className="saved-asset" key={asset.id}>
                                {editingId === asset.id ? (
                                    <input
                                        className="saved-asset__edit-input"
                                        value={editingName}
                                        onChange={event => setEditingName(event.target.value)}
                                        aria-label={`New name for ${asset.name}`}
                                        autoFocus
                                    />
                                ) : (
                                    <span className="saved-asset__name">{asset.name}</span>
                                )}
                                <div className="saved-asset__actions">
                                    {editingId === asset.id ? (
                                        <>
                                            <button type="button" aria-label="Save name" title="Save name" onClick={() => saveEditedName(asset.id)}>
                                                <Icon name="check" />
                                            </button>
                                            <button type="button" aria-label="Cancel rename" title="Cancel rename" onClick={() => setEditingId(null)}>
                                                <Icon name="close" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" aria-label={`Open ${asset.name}`} title={`Open ${asset.name}`} onClick={() => handleOpenSavedAsset(asset.id)}>
                                                <Icon name="open" />
                                            </button>
                                            <button type="button" aria-label={`Edit ${asset.name}`} title={`Edit ${asset.name}`} onClick={() => beginEditing(asset)}>
                                                <Icon name="edit" />
                                            </button>
                                            <button type="button" className="saved-asset__delete" aria-label={`Delete ${asset.name}`} title={`Delete ${asset.name}`} onClick={event => handleDeleteSavedAsset(event, asset.id)}>
                                                <Icon name="trash" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {showUpload && (
                <section className="spine-loader__upload-section" aria-labelledby="upload-heading">
                    <div className="spine-loader__upload-heading-row">
                        <h2 id="upload-heading">Upload new Spine</h2>
                        <button type="button" className="spine-loader__cancel-upload" onClick={() => setShowUpload(false)}>
                            Cancel
                        </button>
                    </div>
                    <label className="spine-loader__name-field">
                        Saved name (optional)
                        <input
                            type="text"
                            value={assetName}
                            onChange={event => setAssetName(event.target.value)}
                            placeholder="Uses the JSON/SKEL filename"
                        />
                    </label>
                    <SpineLoaderInfoText text="Load a spine export (png, json and atlas files) in the box below" />
                    <DropZone onFilesLoaded={onFilesLoaded} onError={onLoadError} onStartLoadingFiles={onStartLoadingFiles} />
                </section>
            )}
        </main>
    );
};

export default SpineLoader;
