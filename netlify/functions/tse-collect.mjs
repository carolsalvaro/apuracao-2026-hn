import settings from '../../config/tse.json' with {type:'json'};
import {collect} from '../lib/collector.mjs';
import {resultStore} from '../lib/store.mjs';
export default async () => {
  if (!settings.enabled) return new Response('TSE disabled: official configuration not verified');
  try {
    const outcome=await collect({store:resultStore(),config:settings});
    console.log(JSON.stringify({event:'tse_collection',...outcome}));
    return Response.json(outcome);
  } catch {
    console.error(JSON.stringify({event:'tse_collection',status:'storage_or_config_failure'}));
    return Response.json({error:'collection_failed'},{status:503});
  }
};
export const config = {schedule:'* * * * *'};
