import { useMemo } from "react";
import { ActionMenuConfigItem } from "../../../config/actionMenuConfig";
import { useSpineViewerStore } from "../../../store";
import ActionItem from "../ActionItem";

interface ActionItemsProps {
    items: ActionMenuConfigItem[],
    selectedItem: ActionMenuConfigItem | null,
    assetsOpen: boolean,
    onAssetsToggle: () => void,
    onPanelClick: () => void
}

const ActionItems: React.FC<ActionItemsProps> = ({ items, selectedItem, assetsOpen, onAssetsToggle, onPanelClick }) => {

    const setMenuItem = useSpineViewerStore(store => store.setMenuItem);

    const handleActionItemClick = (actionItemName: string) => {
        if (actionItemName === "assets") {
            onAssetsToggle();
            return;
        }

        onPanelClick();
        setMenuItem(actionItemName);
    }

    const visibleItems = useMemo(() => items.filter(item => item.visible), [items]);

    return (
        <div className="action-bar__action-items">
            {visibleItems.map(item => {
                const selected = item.name === selectedItem?.name || (item.name === "assets" && assetsOpen);

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
