import { Prisma } from '@prisma/client';
import { canReceiveCampaignEvent } from '../campaignEventVisibility.js';
import { subscribeToDomainEvent, type DomainEvent } from '../domainEvents/index.js';
import { prisma } from '../prisma.js';
import { deliverDiscord } from './delivery.js';
import { formatDiscordEvent, isDiscordEventSupported } from './formatter.js';
let unsubscribe:(()=>void)|null=null;
export function bootstrapDiscordDispatcher():void { if(unsubscribe)return;unsubscribe=subscribeToDomainEvent('*',queue); }
async function queue(event:DomainEvent):Promise<void>{if(!event.campaignId||!isDiscordEventSupported(event.type))return;const visible=await canReceiveCampaignEvent({campaignId:event.campaignId,userId:'discord',role:'GAMEMASTER',allowPlayerChronologyManagement:true,chronologyContributor:true},event);if(!visible)return;const payload=await formatDiscordEvent(event);if(!payload)return;const destinations=await prisma.discordDestination.findMany({where:{campaignId:event.campaignId,enabled:true,suspendedAt:null}});for(const destination of destinations){if(!(destination.subscribedEvents as string[]).includes(event.type))continue;const delivery=await prisma.discordDelivery.create({data:{campaignId:event.campaignId,destinationId:destination.id,eventId:event.id,eventType:event.type,payload:payload as Prisma.InputJsonValue}});setImmediate(()=>void deliverDiscord(delivery.id));}}
