import crypto from 'crypto';

// The secret key should be exactly 32 bytes long for AES-256
// We hash the ENCRYPTION_SECRET from the environment to ensure it's always 32 bytes
const getMasterKey = () => {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SHOPIFY_WEBHOOK_SECRET || 'fallback_secret_only_for_dev_very_long';
  return crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
};

export const encryptPassword = (text: string): { encryptedPassword: string; encryptionIv: string } => {
  const iv = crypto.randomBytes(16); // 16 bytes IV for AES-GCM
  const key = getMasterKey();
  
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedPassword: encrypted + ':' + authTag,
    encryptionIv: iv.toString('hex')
  };
};

export const decryptPassword = (encryptedData: string, ivHex: string): string | null => {
  try {
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const parts = encryptedData.split(':');
    const encryptedText = parts[0];
    const authTag = Buffer.from(parts[1], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};
