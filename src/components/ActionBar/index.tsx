import { useState } from "react";
import { useSpineViewerStore } from "../../store";
import ActionPanel from "../ActionPanel";
import Animations from "../ActionPanel/Animations";
import Mixins from "../ActionPanel/Mixins";
import Settings from "../ActionPanel/Settings";
import Skins from "../ActionPanel/Skins";
import Timeline from "../ActionPanel/Timeline";
import "./ActionBar.css";
import ActionItems from "./ActionItems";
import SettingsButton from "./SettingsButton";
import SavedAssetsDropdown from "./SavedAssetsDropdown";


interface ActionBarProps {
    accountId: string;
}

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

const ActionBar: React.FC<ActionBarProps> = ({ accountId }) => {
    const [savedAssetsOpen, setSavedAssetsOpen] = useState(false);
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

    const toggleSavedAssets = () => {
        if (selectedActionMenuItem) setMenuItem(selectedActionMenuItem.name);
        setSavedAssetsOpen(open => !open);
    };


    return (
        <>
            <div className="action-bar">
                <ActionItems
                    items={actionMenuItems}
                    selectedItem={selectedActionMenuItem}
                    assetsOpen={savedAssetsOpen}
                    onAssetsToggle={toggleSavedAssets}
                    onPanelClick={() => setSavedAssetsOpen(false)}
                />
                <div className="action-bar__bottom-actions">
                    <button
                        type="button"
                        className="action-bar__load-button"
                        aria-label="Load new Spine"
                        title="Load new Spine"
                        onClick={() => {
                            // Keep the current Pixi instance and loaded files
                            // alive while the loader is open. A new upload or
                            // selected saved asset will replace it explicitly.
                            setAssetLibraryOpen(true);
                        }}
                    >
                        +
                    </button>
                    <SettingsButton onClick={handleSettingsClick} />
                </div>
            </div>
            {savedAssetsOpen && <SavedAssetsDropdown accountId={accountId} onClose={() => setSavedAssetsOpen(false)} />}
            <ActionPanel
                open={selectedActionMenuItem !== null}
                panelKey={selectedActionMenuItem?.name ?? ""}
            >
                {selectedActionMenuItem && getCurrentPanel(selectedActionMenuItem.name)}
            </ActionPanel>
        </>

    )
};

export default ActionBar;
