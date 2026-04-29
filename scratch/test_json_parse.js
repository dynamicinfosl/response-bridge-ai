
function extractRouterIp(value) {
  if (typeof value === 'string') {
    value = value.trim();
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try {
        console.log("Parsing stringified JSON:", value);
      } catch (e) {}
    }
  }
}
