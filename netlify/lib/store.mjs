import {getStore} from '@netlify/blobs';
// This PR's staging namespace survives preview deploys, while remaining separate
// from production. Configuration revisions isolate incompatible election data.
export const storeName=context=>context==='production'?'hn-tse-production':'hn-tse-preview-integracao-tse-pr-1';
export function resultStore() {
  return getStore({name:storeName(process.env.CONTEXT),consistency:'strong'});
}
