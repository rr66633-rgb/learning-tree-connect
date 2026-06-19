import { appRouter } from './server/routers.ts';

const record = appRouter._def.record;
const childDocsRouter = record?.childDocuments;
if (childDocsRouter) {
  console.log('childDocuments router exists in record');
  const innerRecord = childDocsRouter._def?.record;
  if (innerRecord) {
    console.log('inner record keys:', Object.keys(innerRecord));
  } else {
    console.log('no inner record');
    console.log('_def keys:', Object.keys(childDocsRouter._def || {}));
  }
} else {
  console.log('childDocuments NOT in record');
  console.log('record keys:', Object.keys(record || {}));
}

// Also check procedures flat list
const procedures = appRouter._def.procedures;
const childDocProcs = Object.keys(procedures).filter(k => k.startsWith('childDocuments'));
console.log('childDocuments procedures in flat list:', childDocProcs);
