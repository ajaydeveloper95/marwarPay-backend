import crypto from 'crypto';

export class AESUtils {
    // —------- Encryption Method —-----------
    static async EncryptRequest(incomingJsonReq, key) {
        const decodedKey = Buffer.from(key, 'base64');
        if (decodedKey.length !== 32) {
            throw new Error("Invalid key");
        }
        // Generate a random IV
        const iv = crypto.randomBytes(16);
        // console.log("IV generated: " + iv.toString('hex'));
        // Convert payload to byte array
        const payloadBytes = Buffer.from(JSON.stringify(incomingJsonReq));
        // Initialize AES cipher
        const cipher = crypto.createCipheriv('aes-256-cbc', decodedKey, iv);
        // Encrypt the data
        const encryptedBytes = Buffer.concat([cipher.update(payloadBytes), cipher.final()]);
        // Combine IV and encrypted data
        const result = Buffer.concat([iv, encryptedBytes]);
        // Return Base64 encoded result
        return result.toString('base64');
    }
    // —-------- Decryption Method -----------
    static async decryptRequest(encryptedString, key) {
        // Decode Base64 encoded input and key
        const byteCipherText = Buffer.from(encryptedString, 'base64');
        const byteKey = Buffer.from(key, 'base64');
        // Extract IV and cipher text from the encrypted input
        const iv = byteCipherText.slice(0, 16);
        const cipherText = byteCipherText.slice(16);
        // Initialize AES cipher for decryption
        const decipher = crypto.createDecipheriv('aes-256-cbc', byteKey, iv);
        // Decrypt the cipher text
        const bytePlainText = Buffer.concat([decipher.update(cipherText), decipher.final()]);
        // Clean the decrypted data and return
        return this.removeNoise(bytePlainText.toString('utf-8').trim());
    }
    // Removing noise and returning clean string up to } or ]
    static removeNoise(data) {
        const lastCurlyBrace = data.lastIndexOf('}');
        const lastSquareBracket = data.lastIndexOf(']');
        const lastIndex = Math.max(lastCurlyBrace, lastSquareBracket);
        if (lastIndex !== -1) {
            return data.substring(0, lastIndex + 1);
        }
        return data;
    }
}

export function airPayencryptText(plainText, key) {
    const iv = crypto.randomBytes(8).toString("hex");
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(plainText, "utf8", "base64");
    encrypted += cipher.final("base64");
    const encryptedText = iv + encrypted;
    return encryptedText;
}

export function airPaydecryptText(encrypted, key) {
                        const key1 = key;
                        const iv1 = encrypted.substring(0, 16);
                        const data = encrypted.substring(16);
                        const decipher = crypto.createDecipheriv("aes-256-cbc", key1, iv1);
                        let decrypted = decipher.update(
                            Buffer.from(data, "base64"),
                            "binary",
                            "utf8"
                        );
                        decrypted += decipher.final("utf8");
                        return decrypted ? decrypted : encrypted;
                    }