import { FormEvent, useState } from "react";
import { toast } from "react-toastify";
import { errorToast } from "../../config/toastsConfig";
import AccountService from "../../services/AccountService";
import { ViewerAccount } from "../../interfaces";
import "./AccountScreen.css";

interface AccountScreenProps {
    onAuthenticated: (account: ViewerAccount) => void;
}

const AccountScreen = ({ onAuthenticated }: AccountScreenProps) => {
    const [registering, setRegistering] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (registering && password !== confirmPassword) {
            toast("Passwords do not match.", errorToast);
            return;
        }

        setBusy(true);
        try {
            const account = registering
                ? await AccountService.register(username, password)
                : await AccountService.login(username, password);
            onAuthenticated(account);
        } catch (error) {
            toast(error instanceof Error ? error.message : "Unable to authenticate.", errorToast);
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="account-screen">
            <form className="account-screen__form" onSubmit={handleSubmit}>
                <h1>{registering ? "Create account" : "Log in"}</h1>
                <label>Email<input type="email" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></label>
                <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={registering ? "new-password" : "current-password"} required /></label>
                {registering && <label>Confirm password<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>}
                <button type="submit" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Log in"}</button>
                <button type="button" className="account-screen__switch" onClick={() => setRegistering(value => !value)}>
                    {registering ? "Already have an account? Log in" : "Create a new account"}
                </button>
            </form>
        </main>
    );
};

export default AccountScreen;
