import fetch from 'node-fetch';

const [,, campaignId, categoryId] = process.argv;
if (!campaignId || !categoryId) {
  console.error('Usage: node fetchIndex.mjs <campaignId> <categoryId>');
  process.exit(1);
}

const url = `http://localhost:3001/api/campaign/${campaignId}/wiki/index/${categoryId}`;

async function main(){
  const res = await fetch(url);
  const body = await res.text();
  try{
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  }catch(e){
    console.log(body);
  }
}

main().catch(e=>{console.error(e); process.exit(1)});
