import settings from '../../config/tse.json' with {type:'json'};
import {collect} from '../lib/collector.mjs';
import {scheduledCollection} from '../lib/collection-policy.mjs';
import {resultStore} from '../lib/store.mjs';
import {digest} from '../lib/tse.mjs';
import bootstrap from '../data/tse-bootstrap.json' with {type:'json'};
export default async () => {
  if (!settings.enabled) return new Response('TSE disabled: official configuration not verified');
  try {
    const seedRecords=bootstrap.revision===digest(settings)?bootstrap.records:{};
    const outcome=await collect({store:resultStore(),config:settings,seedRecords,...scheduledCollection});
    console.log(JSON.stringify({event:'tse_collection',...outcome}));
    return Response.json(outcome);
  } catch {
    console.error(JSON.stringify({event:'tse_collection',status:'storage_or_config_failure'}));
    return Response.json({error:'collection_failed'},{status:503});
  }
};
export const config = {schedule:'* * * * *'};
