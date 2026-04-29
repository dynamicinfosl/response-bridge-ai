
const IPV4_REGEX = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(?:\/\d+)?\b/;

function cleanIp(raw) {
  return raw.includes('/') ? raw.substring(0, raw.indexOf('/')) : raw;
}

function extractIpFromString(text) {
  const match = String(text).match(IPV4_REGEX);
  if (match) {
    const ip = cleanIp(match[0]);
    if (ip === '0.0.0.0') return '';
    return ip;
  }
  return '';
}

console.log(extractIpFromString("0.0.0.0"));
console.log(extractIpFromString("172.16.0.5"));
