const base64UrlDecode = (data: string) => {
  let padding = data.length % 4;
  if (padding > 0) {
    data += '='.repeat(4 - padding);
  }
  return Buffer.from(data.replace(/\-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
};

const decodeJWT = (token: string) => {
  const payloadEncoded = token.split('.')[1];
  const payload = JSON.parse(base64UrlDecode(payloadEncoded));
  return payload;
};

export {decodeJWT}