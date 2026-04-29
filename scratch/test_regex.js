
const IPV4_REGEX = /\b(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/;
const testStr = "172.16.0.5/32";
const match = testStr.match(IPV4_REGEX);
console.log("Match:", match ? match[0] : "null");
