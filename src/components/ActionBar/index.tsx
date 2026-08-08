import { useSpineViewerStore } from "../../store";
import events from "../../events";
import ActionPanel from "../ActionPanel";
import Animations from "../ActionPanel/Animations";
import Mixins from "../ActionPanel/Mixins";
import Settings from "../ActionPanel/Settings";
import Skins from "../ActionPanel/Skins";
import Timeline from "../ActionPanel/Timeline";
import "./ActionBar.css";
import ActionItems from "./ActionItems";
import SettingsButton from "./SettingsButton";


interface ActionBarProps { }

const getCurrentPanel = (key: string): JSX.Element | null => {

    switch (key) {
        case "animations":
            return <Animations />;

        case "skins":
            return <Skins />;

        case "mixins":
            return <Mixins />;

        case "timeline":
            return <Timeline />;

        case "settings":
            return <Settings />;

        default:
            return null;
    }
}

const ActionBar: React.FC<ActionBarProps> = () => {
    const [selectedActionMenuItem, actionMenuItems, setMenuItem, setAssetLibraryOpen] = useSpineViewerStore(store => [
        store.selectedActionMenuItem,
        store.actionMenuItems,
        store.setMenuItem,
        store.setAssetLibraryOpen
    ]);

    let panelContent = null;

    if (selectedActionMenuItem !== null) {
        panelContent = getCurrentPanel(selectedActionMenuItem.name);
    }

    const handleSettingsClick = () => {
        setMenuItem("settings");
    }


    return (
        <>
            <div className="action-bar">
                <ActionItems items={actionMenuItems} selectedItem={selectedActionMenuItem} />
                <div className="action-bar__bottom-actions">
                    <button
                        type="button"
                        className="action-bar__load-button"
                        aria-label="Load new Spine"
                        title="Load new Spine"
                        onClick={() => {
                            const currentFiles = useSpineViewerStore.getState().loadedFiles;
                            events.dispatchers.destroyPixiApp();
                            useSpineViewerStore.getState().reset();
                            useSpineViewerStore.getState().setSuspendedFiles(currentFiles);
                            setAssetLibraryOpen(true);
                        }}
                    >
                        +
                    </button>
                    <SettingsButton onClick={handleSettingsClick} />
                </div>
            </div>
            <ActionPanel open={selectedActionMenuItem !== null}>
                {selectedActionMenuItem && getCurrentPanel(selectedActionMenuItem.name)}
            </ActionPanel>
        </>

    )
};

export default ActionBar;
