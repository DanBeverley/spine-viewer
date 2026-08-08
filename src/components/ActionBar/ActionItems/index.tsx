import { useMemo } from "react";
import { ActionMenuConfigItem } from "../../../config/actionMenuConfig";
import { useSpineViewerStore } from "../../../store";
import ActionItem from "../ActionItem";
import events from "../../../events";

interface ActionItemsProps {
    items: ActionMenuConfigItem[],
    selectedItem: ActionMenuConfigItem | null
}

const ActionItems: React.FC<ActionItemsProps> = ({ items, selectedItem }) => {

    const [setMenuItem, setAssetLibraryOpen] = useSpineViewerStore(store => [
        store.setMenuItem,
        store.setAssetLibraryOpen
    ]);

    const handleActionItemClick = (actionItemName: string) => {
        if (actionItemName === "assets") {
            events.dispatchers.destroyPixiApp();
            setAssetLibraryOpen(true);
            return;
        }

        setMenuItem(actionItemName);
    }

    const visibleItems = useMemo(() => items.filter(item => item.visible), [items]);

    return (
        <div className="action-bar__action-items">
            {visibleItems.map(item => {
                const selected = item.name === selectedItem?.name;

                return (
                    <ActionItem
                        key={item.name}
                        icon={item.icon}
                        name={item.name}
                        label={item.label}
                        selected={selected}
                        onClick={handleActionItemClick}
                    />
                )
            })}
        </div>
    )
};

export default ActionItems;
