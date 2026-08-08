interface ActionItemProps {
    icon: string;
    name: string;
    label: string;
    selected: boolean;
    onClick: (menuName: string) => void;
}

const ActionItem: React.FC<ActionItemProps> = ({ name, icon, label, selected, onClick }) => {

    const className = `action-bar__action-item ${selected ? "action-bar__action-item--selected" : ""}`;

    return (
        <button
            type="button"
            className={className}
            onClick={() => onClick(name)}
            aria-label={label}
            title={label}
        >
            <img className="action-item__icon" src={icon} alt="" aria-hidden="true" />
        </button>
    );
};

export default ActionItem;
