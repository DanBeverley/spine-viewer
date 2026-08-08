import actionMenuConfig, { ActionMenuConfigItem } from "../../config/actionMenuConfig";
import create from "zustand";
import { devtools } from "zustand/middleware";
import { FileEntry, TimelineEntry } from "../../interfaces";
import { SpineMixin } from "../../interfaces";
import SpineLoaderService from "../../services/SpineLoaderService";

export interface SpineViewerStore {
    actionMenuItems: ActionMenuConfigItem[],
    selectedActionMenuItem: ActionMenuConfigItem | null,
    loadedFiles: FileEntry[];
    suspendedFiles: FileEntry[];
    filesLoading: boolean;
    animations: string[];
    skins: string[];
    timeline: TimelineEntry[];
    mixins: SpineMixin[];
    loopAnimations: boolean;
    timeScale: number;
    assetLibraryOpen: boolean;
    panelScrollPositions: Record<string, number>;
}

export interface SpineViewerActions {
    setMultiple: (partial: Partial<SpineViewerStore>) => void;
    setSpineStateProperty: <T>(key: string, stateProp: T) => void;
    setAnimations: (animations: string[]) => void;
    setMixins: (mixins: SpineMixin[]) => void;
    setTimeline: (timeline: TimelineEntry[]) => void;
    setFilesLoading: (filesLoading: boolean) => void;
    setMenuItem: (menuItemName: string) => void;
    setLoadedFiles: (loadedFiles: FileEntry[]) => void;
    setSuspendedFiles: (suspendedFiles: FileEntry[]) => void;
    setLoopAnimations: (loopAnimations: boolean) => void;
    setTimeScale: (timeScale: number) => void;
    setAssetLibraryOpen: (assetLibraryOpen: boolean) => void;
    setPanelScrollPosition: (panelName: string, scrollTop: number) => void;
    reset: () => void;
    initAsyncData: () => void;
}

const initialState: SpineViewerStore = {
    actionMenuItems: actionMenuConfig,
    selectedActionMenuItem: null,
    filesLoading: false,
    loadedFiles: [],
    suspendedFiles: [],
    timeline: [],
    mixins: [],
    animations: [],
    skins: [],
    loopAnimations: true,
    timeScale: 1,
    assetLibraryOpen: false,
    panelScrollPositions: {},
}

export const useSpineViewerStore = create<SpineViewerStore & SpineViewerActions>()(
    devtools((set) => ({
        ...initialState,
        setSpineStateProperty: <T>(key: string, stateProp: T) => {
            return () => {
                set(_ => ({ [key]: stateProp }))
            };
        },
        setMultiple: (partialStore: Partial<SpineViewerStore>) => {
            set(_ => partialStore)
        },
        setAnimations: (animations: string[]) => {
            set(_ => ({ animations }))
        },
        setMixins: (mixins: SpineMixin[]) => {
            set(_ => ({ mixins }))
        },
        setTimeline: (timeline: TimelineEntry[]) => {
            set(_ => ({ timeline }))
        },
        setLoopAnimations: (loopAnimations: boolean) => {
            set(_ => ({ loopAnimations }))
        },
        setTimeScale: (timeScale: number) => {
            set(_ => ({ timeScale }))
        },
        setAssetLibraryOpen: (assetLibraryOpen: boolean) => {
            set(_ => ({ assetLibraryOpen }))
        },
        setPanelScrollPosition: (panelName: string, scrollTop: number) => {
            set(state => ({
                panelScrollPositions: {
                    ...state.panelScrollPositions,
                    [panelName]: scrollTop
                }
            }))
        },
        setFilesLoading: (filesLoading: boolean) => {
            set(_ => ({ filesLoading }))
        },
        setLoadedFiles: (loadedFiles: FileEntry[]) => {
            set(_ => ({ loadedFiles }))
        },
        setSuspendedFiles: (suspendedFiles: FileEntry[]) => {
            set(_ => ({ suspendedFiles }))
        },
        setMenuItem: (menuItemName: string) => {
            set(state => {
                const newMenuItem = state.actionMenuItems.find(item => item.name === menuItemName);
                if (!state.selectedActionMenuItem) {
                    return {
                        selectedActionMenuItem: newMenuItem
                    };
                }

                if (state.selectedActionMenuItem.name !== menuItemName) {
                    return {
                        selectedActionMenuItem: newMenuItem
                    }
                }

                return { selectedActionMenuItem: null };
            })
        },
        reset: () => {
            set(_ => initialState);
        },
        initAsyncData: () => {
            const params = new URLSearchParams(window.location.search);
            const loadUrl = params.get("loadUrl");
            if(loadUrl) {
                set(_ => ({filesLoading: true}));
                SpineLoaderService.loadFromUrl(loadUrl).then((data) => {
                    set(_ => ({
                        filesLoading: false,
                        loadedFiles: data
                    }));
                })
            }
        }
    }))
);
