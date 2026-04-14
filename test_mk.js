const { consultaDoc } = require('./src/lib/mk-api');
const { getMKConfig } = require('./src/lib/mk-config');

async function test() {
  console.log("Config:", await getMKConfig());
  const res = await consultaDoc('02031023719'); // example or hardcoded
  console.log('Result:', JSON.stringify(res, null, 2));
}

test().catch(console.error);
