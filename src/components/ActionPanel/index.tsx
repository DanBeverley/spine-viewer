import { useEffect, useRef } from "react";
import { useSpineViewerStore } from "../../store";
import "./ActionPanel.css";

interface ActionPanelProps {
    children: JSX.Element | JSX.Element[] | null;
    open: boolean;
    panelKey: string;
}

const ActionPanel: React.FC<ActionPanelProps> = (props) => {
    const { children, open, panelKey } = props;
    const panelRef = useRef<HTMLDivElement>(null);
    const setPanelScrollPosition = useSpineViewerStore(state => state.setPanelScrollPosition);

    const className = `action-bar__action-panel ${open ? "action-bar__action-panel--open" : ''}`

    useEffect(() => {
        if (!open || !panelRef.current) return;
        panelRef.current.scrollTop = useSpineViewerStore.getState().panelScrollPositions[panelKey] ?? 0;
    }, [open, panelKey]);

    return (
        <div
            ref={panelRef}
            className={className}
            onScroll={event => setPanelScrollPosition(panelKey, event.currentTarget.scrollTop)}
        >
            {children}
        </div>
    );
};

export default ActionPanel;
