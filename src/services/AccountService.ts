import { ViewerAccount } from "../interfaces";
import {
    ACCOUNT_STORE_NAME,
    openSpineDatabase,
    SESSION_STORE_NAME,
    StoredAccount,
    StoredSession
} from "./SpineDatabase";

const SESSION_ID = "current" as const;
const PBKDF2_ITERATIONS = 100_000;

const normalizeUsername = (username: string) => username.trim().toLocaleLowerCase();

const encode = (value: ArrayBuffer): string => {
    const bytes = new Uint8Array(value);
    let binary = "";
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
};

const decode = (value: string): Uint8Array => {
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const fallbackHash = (password: string, salt: Uint8Array): string => {
    const input = `${encode(salt)}:${password}`;
    let first = 2166136261;
    let second = 2246822519;

    for (let round = 0; round < 10_000; round += 1) {
        for (let index = 0; index < input.length; index += 1) {
            const code = input.charCodeAt(index) + round;
            first = Math.imul(first ^ code, 16777619) >>> 0;
            second = Math.imul(second ^ (code + first), 2246822519) >>> 0;
        }
    }

    return `${first.toString(16)}${second.toString(16)}`;
};

const hashPassword = async (
    password: string,
    salt: Uint8Array,
    algorithm: "pbkdf2" | "local-fallback"
): Promise<string> => {
    if (algorithm === "local-fallback") return fallbackHash(password, salt);
    if (!globalThis.crypto?.subtle) {
        throw new Error("This account requires an HTTPS connection for password verification.");
    }

    const key = await globalThis.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const bits = await globalThis.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        key,
        256
    );
    return encode(bits);
};

const publicAccount = (account: StoredAccount): ViewerAccount => ({
    id: account.id,
    username: account.username
});

class AccountService {
    private static async getStoredAccount(id: string): Promise<StoredAccount | undefined> {
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(ACCOUNT_STORE_NAME, "readonly");
            const request = transaction.objectStore(ACCOUNT_STORE_NAME).get(id);
            request.onsuccess = () => {
                database.close();
                resolve(request.result as StoredAccount | undefined);
            };
            transaction.onerror = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to read account data."));
            };
        });
    }

    private static async setSession(accountId: string): Promise<void> {
        const database = await openSpineDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(SESSION_STORE_NAME, "readwrite");
            const session: StoredSession = { id: SESSION_ID, accountId };
            transaction.objectStore(SESSION_STORE_NAME).put(session);
            transaction.oncomplete = () => {
                database.close();
                resolve();
            };
            transaction.onerror = () => {
                database.close();
                reject(transaction.error ?? new Error("Unable to persist the account session."));
            };
        });
    }

    public static async register(username: string, password: string): Promise<ViewerAccount> {
        const displayName = username.trim();
        const id = normalizeUsername(username);
        if (displayName.length < 3) throw new Error("Username must be at least 3 characters.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (!globalThis.crypto?.getRandomValues) throw new Error("Secure account storage is unavailable in this browser.");
        if (await this.getStoredAccount(id)) throw new Error("That username is already registered on this device.");

        const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
        const algorithm = globalThis.crypto.subtle ? "pbkdf2" : "local-fallback";
        const account: StoredAccount = {
            id,
            username: displayName,
            salt: encode(salt),
            passwordHash: await hashPassword(password, salt, algorithm),
            algorithm,
            createdAt: Date.now()
        };
        const database = await openSpineDatabase();

        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(ACCOUNT_STORE_NAME, "readwrite");
            transaction.objectStore(ACCOUNT_STORE_NAME).put(account);
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Unable to create account.")); };
        });
        await this.setSession(account.id);
        return publicAccount(account);
    }

    public static async login(username: string, password: string): Promise<ViewerAccount> {
        const account = await this.getStoredAccount(normalizeUsername(username));
        if (!account) throw new Error("Invalid username or password.");

        const passwordHash = await hashPassword(password, decode(account.salt), account.algorithm ?? "pbkdf2");
        if (passwordHash !== account.passwordHash) throw new Error("Invalid username or password.");

        await this.setSession(account.id);
        return publicAccount(account);
    }

    public static async getCurrentAccount(): Promise<ViewerAccount | null> {
        const database = await openSpineDatabase();

        const session = await new Promise<StoredSession | undefined>((resolve, reject) => {
            const transaction = database.transaction(SESSION_STORE_NAME, "readonly");
            const request = transaction.objectStore(SESSION_STORE_NAME).get(SESSION_ID);
            request.onsuccess = () => resolve(request.result as StoredSession | undefined);
            transaction.onerror = () => reject(transaction.error ?? new Error("Unable to read account session."));
        });
        database.close();

        if (!session) return null;
        const account = await this.getStoredAccount(session.accountId);
        return account ? publicAccount(account) : null;
    }

    public static async logout(): Promise<void> {
        const database = await openSpineDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(SESSION_STORE_NAME, "readwrite");
            transaction.objectStore(SESSION_STORE_NAME).delete(SESSION_ID);
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Unable to log out.")); };
        });
    }
}

export default AccountService;
