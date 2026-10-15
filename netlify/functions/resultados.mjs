import settings from '../../config/tse.json' with {type:'json'};
import {createResultsHandler} from '../lib/results-api.mjs';
import {resultStore} from '../lib/store.mjs';
export default createResultsHandler({config:settings,getStore:resultStore});
export const config={path:'/api/resultados'};
