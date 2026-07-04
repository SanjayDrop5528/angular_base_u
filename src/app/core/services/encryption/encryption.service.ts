import { Injectable } from '@angular/core';
import * as pako from 'pako';
import * as CryptoJS from 'crypto-js';

const AES_KEY_HEX =
'603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {

  private key = CryptoJS.enc.Hex.parse(AES_KEY_HEX);

  encrypt(data: any): ArrayBuffer {

    const json = JSON.stringify(data);
    const compressed = pako.gzip(json);

    let latin1Str = '';

    for (const byte of compressed) {
      latin1Str += String.fromCharCode(byte);
    }

    const wordArray = CryptoJS.enc.Latin1.parse(latin1Str);

    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(wordArray, this.key, {
      iv
    }).ciphertext;

    const payload = CryptoJS.lib.WordArray.create(
      iv.words.concat(encrypted.words),
      iv.sigBytes + encrypted.sigBytes
    );

    const uint8Payload = new Uint8Array(payload.sigBytes);

    for (let i = 0; i < payload.sigBytes; i++) {
      uint8Payload[i] =
        (payload.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    return uint8Payload.buffer;
  }

  decrypt(buffer: ArrayBuffer,isStream=false): any {

    const encryptedData = new Uint8Array(buffer);

    const ivBytes = encryptedData.slice(0, 16);
    const cipherBytes = encryptedData.slice(16);

    const iv = CryptoJS.lib.WordArray.create(ivBytes as any);
    const ciphertext = CryptoJS.lib.WordArray.create(cipherBytes as any);

    const decrypted = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext }),
      this.key,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    const decryptedBytes = new Uint8Array(decrypted.sigBytes);

    for (let i = 0; i < decrypted.sigBytes; i++) {
      decryptedBytes[i] =
        (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    const decompressed = pako.ungzip(decryptedBytes, { to: 'string' });
    try {
      return JSON.parse(decompressed);
    } catch (e) {
      return decompressed;
    }
  }
}