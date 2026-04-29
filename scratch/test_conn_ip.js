
const FRAMED_IP_KEYS = [
  'framedipaddress', 'framedip', 'framed_ip', 'framed_ip_address',
  'frameip', 'frame_ip', 'ip_conexao', 'conexao_ip', 'ip_atribuido',
  'ip_atrib', 'ipaddr', 'ip_address', 'ipaddress', 'ip'
];
const IPV4_REGEX = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(?:\/\d+)?\b/;

function extractIpFromConn(conn) {
  for (const k of FRAMED_IP_KEYS) {
    const key = Object.keys(conn).find(key => key.toLowerCase() === k);
    if (key && conn[key]) {
      const match = String(conn[key]).match(IPV4_REGEX);
      if (match) return match[0].includes('/') ? match[0].substring(0, match[0].indexOf('/')) : match[0];
    }
  }
  return null;
}

const conn = { "ip_address": "100.64.0.10/32", "cd_conexao": 123 };
console.log(extractIpFromConn(conn));
