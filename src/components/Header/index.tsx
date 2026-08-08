import "./Header.css"
import ThemeToggle from "./ThemeToggle";
import { ViewerAccount } from "../../interfaces";

interface HeaderProps {
    account?: ViewerAccount | null;
    onLogout?: () => void;
}

const Header = ({ account, onLogout }: HeaderProps) => {

    return (
        <header className="header">
            <div className="header__content-wrapper">
                {account && onLogout && (
                    <div className="header__account">
                        <span>{account.username}</span>
                        <button type="button" onClick={onLogout}>Log out</button>
                    </div>
                )}
                <ThemeToggle />
            </div>
        </header>
    );
};

export default Header;
