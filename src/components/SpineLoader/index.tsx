import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { errorToast } from "../../config/toastsConfig";
import { FileEntry, SavedSpineAsset } from "../../interfaces";
import SpineProvider from "../../providers/SpineProvider";
import { useSpineViewerStore } from "../../store";
import AssetLibraryService from "../../services/AssetLibraryService";
import DropZone from "./DropZone";
import LoadDefaultSpinButton from "./LoadDefaultSpinButton";
import "./SpineLoader.css";
import SpineLoaderInfoText from "./SpineLoaderInfoText";


const SpineLoader = () => {
    const [savedAssets, setSavedAssets] = useState<SavedSpineAsset[]>([]);

    const { setLoadedFiles, setFilesLoading } = useSpineViewerStore(state => {
        return {
            setLoadedFiles: state.setLoadedFiles,
            setFilesLoading: state.setFilesLoading,
            setAnimations: state.setAnimations
        }
    });

    const refreshSavedAssets = () => {
        AssetLibraryService.list()
            .then(setSavedAssets)
            .catch(error => {
                toast(`Saved asset library unavailable: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    };

    useEffect(() => {
        refreshSavedAssets();
    }, []);

    const onFilesLoaded = (files: FileEntry[]) => {
        setLoadedFiles(files);
        setFilesLoading(false);

        AssetLibraryService.save(files)
            .then(refreshSavedAssets)
            .catch(error => {
                toast(`Could not save this Spine asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    };

    const onStartLoadingFiles = () => {
        setFilesLoading(true);
    }

    const onLoadError = (message: string) => {
        toast(message, errorToast);
        setFilesLoading(false);
        setLoadedFiles([]);
    }

    const handleDefaultSpineLoad = () => {
        setFilesLoading(true);
        SpineProvider.getDemoSpine().then((fileEntries) => {
            setLoadedFiles(fileEntries as FileEntry[]);
            setFilesLoading(false);
        });
    }

    const handleOpenSavedAsset = (id: string) => {
        setFilesLoading(true);
        AssetLibraryService.get(id)
            .then(asset => {
                if (!asset || !asset.files.length) {
                    throw new Error("This saved Spine asset is missing or corrupted.");
                }

                setLoadedFiles(asset.files);
                setFilesLoading(false);
            })
            .catch(error => {
                toast(`Could not open saved asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
                setFilesLoading(false);
            });
    };

    const handleDeleteSavedAsset = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();

        AssetLibraryService.delete(id)
            .then(refreshSavedAssets)
            .catch(error => {
                toast(`Could not delete saved asset: ${error instanceof Error ? error.message : "unknown error"}`, errorToast);
            });
    };

    return (
        <div className="spine-loader">
            {savedAssets.length > 0 && (
                <section className="saved-assets" aria-labelledby="saved-assets-heading">
                    <h2 id="saved-assets-heading">Saved assets</h2>
                    <div className="saved-assets__list">
                        {savedAssets.map(asset => (
                            <div className="saved-asset" key={asset.id}>
                                <span className="saved-asset__name">{asset.name}</span>
                                <div className="saved-asset__actions">
                                    <button type="button" onClick={() => handleOpenSavedAsset(asset.id)}>
                                        Open
                                    </button>
                                    <button
                                        type="button"
                                        className="saved-asset__delete"
                                        aria-label={`Delete ${asset.name}`}
                                        title={`Delete ${asset.name}`}
                                        onClick={event => handleDeleteSavedAsset(event, asset.id)}
                                    >
                                        Trash
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            <h2 className="spine-loader__upload-heading">Upload new Spine</h2>
            <LoadDefaultSpinButton onClick={handleDefaultSpineLoad} />
            <SpineLoaderInfoText text="Or load a spine export (png, json and atlas files) in the box below" />
            <DropZone onFilesLoaded={onFilesLoaded} onError={onLoadError} onStartLoadingFiles={onStartLoadingFiles} />
        </div>
    )
};

export default SpineLoader;
