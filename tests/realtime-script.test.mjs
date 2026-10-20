import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let mode='active';
const calls=[];
const ctx={
  PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'test-key'})},
  ScriptApp:{getOAuthToken:()=> 'test-token'},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},
  UrlFetchApp:{fetch:(url,options)=>{
    const body=JSON.parse(options.payload);calls.push({url,body});
    const isMinutes=body.dimensions?.[0]?.name==='minutesAgo';
    const isCountry=body.dimensions?.[0]?.name==='countryId';
    if(mode==='failed')return {getResponseCode:()=>403,getContentText:()=>'{"error":{"message":"GA4 access denied"}}'};
    if(mode==='empty')return {getResponseCode:()=>200,getContentText:()=>'{"rows":[],"rowCount":0}'};
    const response=isMinutes?{rows:[
      {dimensionValues:[{value:'0'}],metricValues:[{value:'7'}]},
      {dimensionValues:[{value:'3'}],metricValues:[{value:'2'}]}
    ]}:isCountry?{
      totals:[{metricValues:[{value:'5'}]}],
      rows:[
        {dimensionValues:[{value:'US'}],metricValues:[{value:'4'}]},
        {dimensionValues:[{value:'GB'}],metricValues:[{value:'3'}]}
      ]
    }:{rows:[{metricValues:[{value:'5'}]}]};
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(response)};
  }}
};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/google/Code.gs','utf8'),ctx);
const run=()=>ctx.doPost({postData:{contents:JSON.stringify({secret:'test-key',action:'realtimeV3',projects:[{id:'one',ga:'properties/123'}]})}});

let result=run();
assert.equal(result.ok,true);
assert.equal(result.projects[0].activeUsers,5,'property total must not be summed from country rows');
assert.deepEqual(Array.from(result.projects[0].views),[0,2,0,0,7]);
assert.equal(result.projects[0].countries.length,2);
assert.equal(calls.length,2);
assert.equal(calls[0].body.metricAggregations[0],'TOTAL');
assert.equal(calls[1].body.metrics[0].name,'screenPageViews');

mode='empty';result=run();
assert.equal(result.projects[0].activeUsers,0,'empty GA4 response is a genuine zero');
assert.deepEqual(Array.from(result.projects[0].views),[0,0,0,0,0]);

mode='failed';result=run();
assert.equal(result.projects[0].activeUsers,null,'permission failures must not become zero');
assert.match(result.projects[0].error,/access denied/i);
assert.equal(result.projects[0].views,null);

console.log('OK: live property totals, country counts, minute ordering, zero traffic and GA4 failures.');
