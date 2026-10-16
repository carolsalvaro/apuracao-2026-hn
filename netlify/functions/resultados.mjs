import settings from '../../config/tse.json' with {type:'json'};
import {createResultsHandler} from '../lib/results-api.mjs';
import {resultStore} from '../lib/store.mjs';
import {collect} from '../lib/collector.mjs';
import {digest} from '../lib/tse.mjs';
import bootstrap from '../data/tse-bootstrap.json' with {type:'json'};
const seedRecords=bootstrap.revision===digest(settings)?bootstrap.records:{};
// Preview deploys do not run schedules. A shared lease bounds read-through
// refreshes to at most 16 fixed sources per minute, across all visitors, with
// a 12-second start budget (one last 8-second request may still be finishing).
// Only the requested configured localities are eligible; arbitrary URLs are rejected.
export default createResultsHandler({config:settings,getStore:resultStore,seedRecords,
  refresh:async({store,ids})=>{
    const started=Date.now();
    try{
      const outcome=await collect({store,config:settings,priorityIds:ids,seedRecords,batchSize:16});
      if(outcome.checked)console.log(JSON.stringify({event:'tse_read_refresh',...outcome,durationMs:Date.now()-started}));
      return outcome;
    }catch(error){
      console.error(JSON.stringify({event:'tse_read_refresh',status:'storage_or_config_failure',durationMs:Date.now()-started}));
      throw error;
    }
  }});
export const config={path:'/api/resultados'};
