import {getStore} from '@netlify/blobs';
// Site-wide store: retained across function instances/deploys. Preview writes are isolated.
export function resultStore() {
  const scope=process.env.CONTEXT==='production'?'production':`preview-${process.env.DEPLOY_ID??'local'}`;
  return getStore({name:`hn-tse-${scope}`,consistency:'strong'});
}
