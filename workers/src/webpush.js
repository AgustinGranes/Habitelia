function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(array) {
  let base64 = btoa(String.fromCharCode.apply(null, array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const te = new TextEncoder();

async function hkdfExtract(salt, ikm) {
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', saltKey, ikm);
  return new Uint8Array(prk);
}

async function hkdfExpand(prk, info, length) {
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoAndCounter = new Uint8Array(info.length + 1);
  infoAndCounter.set(info);
  infoAndCounter[info.length] = 1;
  const result = await crypto.subtle.sign('HMAC', prkKey, infoAndCounter);
  return new Uint8Array(result).slice(0, length);
}

async function hkdf(salt, ikm, info, length) {
  const prk = await hkdfExtract(salt, ikm);
  return await hkdfExpand(prk, info, length);
}

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function getVapidPrivateKeyJwk(publicKeyBase64url, privateKeyBase64url) {
  const pubBytes = urlBase64ToUint8Array(publicKeyBase64url);
  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);
  const d = urlBase64ToUint8Array(privateKeyBase64url);

  return {
    kty: "EC",
    crv: "P-256",
    d: uint8ArrayToBase64Url(d),
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    ext: true
  };
}

async function createVapidJwt(aud, vapidPublicKey, vapidPrivateKey) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: 'mailto:habitelia@notifications.app'
  };

  const encodedHeader = uint8ArrayToBase64Url(te.encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(te.encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const jwk = await getVapidPrivateKeyJwk(vapidPublicKey, vapidPrivateKey);
  const privateKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    te.encode(unsignedToken)
  );

  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${unsignedToken}.${encodedSignature}`;
}

export async function sendWebPush(subscription, payloadStr, vapidKeys) {
  const { endpoint, keys: { p256dh, auth } } = subscription;

  const endpointUrl = new URL(endpoint);
  const aud = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const jwt = await createVapidJwt(aud, vapidKeys.publicKey, vapidKeys.privateKey);

  // 1. Generate ephemeral ECDH P-256 key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );

  // 2. ECDH key agreement with subscriber's p256dh public key
  const uaPubBytes = urlBase64ToUint8Array(p256dh);
  const uaPubJwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(uaPubBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(uaPubBytes.slice(33, 65)),
    ext: true
  };
  const uaPublicKey = await crypto.subtle.importKey(
    'jwk', uaPubJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  const ecdhSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublicKey }, localKeyPair.privateKey, 256
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const asPublicRaw = new Uint8Array(localPublicKeyRaw);

  // 3. HKDF key derivation
  const authSecret = urlBase64ToUint8Array(auth);
  const keyInfo = concatUint8Arrays([te.encode('WebPush: info\0'), uaPubBytes, asPublicRaw]);
  const ikm = await hkdf(authSecret, new Uint8Array(ecdhSecret), keyInfo, 32);

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);

  // 4. AES-128-GCM encryption
  const payloadBytes = te.encode(payloadStr);
  const paddedPlaintext = new Uint8Array(payloadBytes.length + 1);
  paddedPlaintext.set(payloadBytes);
  paddedPlaintext[payloadBytes.length] = 0x02;

  const cryptoKey = await crypto.subtle.importKey(
    'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, cryptoKey, paddedPlaintext
  );

  // 5. Build final body
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096 in BE
  const idlen = new Uint8Array([65]);
  
  const body = concatUint8Arrays([
    salt,
    rs,
    idlen,
    asPublicRaw,
    new Uint8Array(ciphertext)
  ]);

  const headers = {
    'Authorization': `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    'TTL': '2419200'
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body
  });

  return response;
}
