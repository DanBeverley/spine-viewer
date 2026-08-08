/**
 * Spine runtime version enumeration
 */
export enum SPINE_VERSION {
    VER37 = '3.7',
    VER38 = '3.8',
    VER40 = '4.0',
    VER41 = '4.1',
    UNKNOWN = 'unknown'
}

interface BinaryReadResult {
    value: number;
    nextOffset: number;
}

interface BinaryStringResult {
    value: string | undefined;
    nextOffset: number;
}

const readVarint = (bytes: Uint8Array, offset: number): BinaryReadResult | undefined => {
    let value = 0;
    let shift = 0;

    for (let index = offset; index < bytes.length && shift <= 28; index += 1) {
        const byte = bytes[index];
        value |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) return { value, nextOffset: index + 1 };
        shift += 7;
    }

    return undefined;
};

const readBinaryString = (bytes: Uint8Array, offset: number): BinaryStringResult | undefined => {
    const lengthResult = readVarint(bytes, offset);
    if (!lengthResult) return undefined;
    if (lengthResult.value === 0) return { value: undefined, nextOffset: lengthResult.nextOffset };

    const byteLength = lengthResult.value - 1;
    const endOffset = lengthResult.nextOffset + byteLength;
    if (byteLength < 0 || endOffset > bytes.length) return undefined;

    return {
        value: new TextDecoder().decode(bytes.subarray(lengthResult.nextOffset, endOffset)),
        nextOffset: endOffset
    };
};

const isVersionString = (value: string | undefined): value is string =>
    !!value && /^\d+\.\d+(?:\.\d+)?/.test(value);

/**
 * Reads the version embedded in a Spine binary skeleton header.
 * Spine 3.7/3.8 store a string hash followed by the version string;
 * Spine 4.0/4.1 store an 8-byte hash followed by the version string.
 */
export function readSpineBinaryVersion(binary: ArrayBuffer): string | undefined {
    const bytes = new Uint8Array(binary);

    const legacyHash = readBinaryString(bytes, 0);
    const legacyVersion = legacyHash && readBinaryString(bytes, legacyHash.nextOffset);
    if (legacyVersion && isVersionString(legacyVersion.value)) return legacyVersion.value;

    const modernVersion = readBinaryString(bytes, 8);
    return modernVersion && isVersionString(modernVersion.value)
        ? modernVersion.value
        : undefined;
}

/**
 * Detects the Spine runtime version from a version string
 * @param version - Version string from spine data (e.g., "3.8.99", "4.1.23")
 * @returns The detected SPINE_VERSION enum value
 */
export function detectSpineVersion(version: string | undefined): SPINE_VERSION {
    if (!version) {
        console.warn('Spine version not provided, defaulting to 3.8');
        return SPINE_VERSION.UNKNOWN;
    }

    // Extract major.minor version (e.g., "3.8.99" -> "3.8")
    const versionParts = version.split('.');
    if (versionParts.length < 2) {
        console.warn(`Invalid spine version format: ${version}, defaulting to 3.8`);
        return SPINE_VERSION.UNKNOWN;
    }

    const majorMinor = `${versionParts[0]}.${versionParts[1]}`;

    switch (majorMinor) {
        case '3.7':
            return SPINE_VERSION.VER37;
        case '3.8':
            return SPINE_VERSION.VER38;
        case '4.0':
            return SPINE_VERSION.VER40;
        case '4.1':
            return SPINE_VERSION.VER41;
        default:
            console.warn(`Unsupported spine version: ${version}, defaulting to 3.8`);
            return SPINE_VERSION.UNKNOWN;
    }
}
