import { Prisma } from '../prismaClient.js';
import { decryptSecretOrDevStore } from '../crypto/secretBox.js';
import { fetchAuthenticatedRemote } from '../networkFetch.js';
import { prisma } from '../prisma.js';

const MAX_ATTEMPTS=4, SUSPEND_AFTER=8;
let started=false;
export function startDiscordDeliverySweep():void { if(started)return; started=true; const sweep=async()=>{const rows=await prisma.discordDelivery.findMany({where:{status:{in:['PENDING','RETRYING']},OR:[{nextAttemptAt:null},{nextAttemptAt:{lte:new Date()}}]},select:{id:true},take:100});for(const row of rows)void deliverDiscord(row.id);};void sweep();setInterval(()=>void sweep(),60_000).unref(); }

export async function deliverDiscord(id:string):Promise<void>{
 const row=await prisma.discordDelivery.findUnique({where:{id},include:{destination:true}}); if(!row||((!row.destination.enabled||row.destination.suspendedAt)&&!row.isTest))return;
 let status:number|null=null, diagnostic:string|null=null, retryAfter:number|null=null;
 try { const url=new URL(decryptSecretOrDevStore(row.destination.webhookUrlEnc)); url.searchParams.set('wait','true');
  const response=await fetchAuthenticatedRemote(url,{name:'User-Agent',value:'Esiana/1.0'},{allowedOrigins:[url.origin],method:'POST',body:JSON.stringify(row.payload),timeoutSeconds:10,maxBytes:4096,headers:{'Content-Type':'application/json'}}); status=response.status;
  if(status>=200&&status<300){await prisma.$transaction([prisma.discordDelivery.update({where:{id},data:{status:'SUCCEEDED',attemptCount:{increment:1},responseStatus:status,diagnostic:null,deliveredAt:new Date(),nextAttemptAt:null}}),prisma.discordDestination.update({where:{id:row.destinationId},data:{consecutiveFailures:0,lastSucceededAt:new Date(),lastError:null}})]);return;}
  if(status===429){try{const parsed=JSON.parse(response.body.toString()) as {retry_after?:number};if(typeof parsed.retry_after==='number')retryAfter=Math.min(parsed.retry_after*1000,15*60_000);}catch{}}
  diagnostic=status===429?'Discord rate limited the request.':`Discord returned HTTP ${status}.`;
 } catch(error){diagnostic=error instanceof Error?error.message.replace(/https?:\/\/\S+/g,'[redacted URL]').slice(0,500):'Discord delivery failed';}
 const attempts=row.attemptCount+1, terminal=attempts>=MAX_ATTEMPTS; const endpoint=await prisma.discordDestination.update({where:{id:row.destinationId},data:{consecutiveFailures:{increment:1},lastFailedAt:new Date(),lastError:diagnostic},select:{consecutiveFailures:true}}); const suspend=endpoint.consecutiveFailures>=SUSPEND_AFTER; const delay=retryAfter??Math.min(60_000*2**Math.max(0,attempts-1),15*60_000);
 await prisma.$transaction([prisma.discordDelivery.update({where:{id},data:{status:terminal?'FAILED':'RETRYING',attemptCount:attempts,responseStatus:status,diagnostic,nextAttemptAt:terminal?null:new Date(Date.now()+delay)}}),...(suspend?[prisma.discordDestination.update({where:{id:row.destinationId},data:{enabled:false,suspendedAt:new Date()}})]:[])] as Prisma.PrismaPromise<unknown>[]); if(!terminal&&!suspend)setTimeout(()=>void deliverDiscord(id),delay).unref();
}
