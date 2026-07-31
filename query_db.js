import { readFileSync } from 'fs';

const content = readFileSync('c:\\Users\\Administrator\\Documents\\Project Cursor\\response-brigde\\migracao_completa.sql', 'utf8');

// Find blocks of INSERT INTO auth.users
const regex = /INSERT INTO auth\.users[\s\S]*?VALUES[\s\S]*?\(([\s\S]*?)\)/g;
let match;
const userHashes = [];

while ((match = regex.exec(content)) !== null) {
  const valuesText = match[1];
  // Extract all single quoted values
  const quoteRegex = /'([^']*)'/g;
  let qMatch;
  const values = [];
  while ((qMatch = quoteRegex.exec(valuesText)) !== null) {
    values.push(qMatch[1]);
  }
  
  if (values.length >= 6) {
    userHashes.push({
      id: values[0],
      email: values[4],
      hash: values[5]
    });
  }
}

console.log(`Parsed ${userHashes.length} user hashes:`);
userHashes.forEach(uh => {
  console.log(`  ${uh.email}: id=${uh.id}, hash=${uh.hash}`);
});
