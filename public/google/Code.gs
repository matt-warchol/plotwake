// Project Pulse. Read-only GA4 and Search Console reports.
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PULSE_KEY')) props.setProperty('PULSE_KEY', Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,''));
  console.log('Connection key (paste only into your private dashboard): ' + props.getProperty('PULSE_KEY'));
  // Requests authorization before deployment. Never return the Google OAuth token.
  ScriptApp.getOAuthToken();
}
function doGet() { return json_({ok:false,error:'Project Pulse: use the protected POST connection.'}); }
function doPost(e) {
  try {
    var input=JSON.parse(e.postData.contents||'{}');
    var key=PropertiesService.getScriptProperties().getProperty('PULSE_KEY');
    if(!key || input.secret!==key) return json_({ok:false,error:'Invalid connection key.'});
    if(input.action==='discover') return json_(discover_());
    if(input.action==='breakdownV2') return json_(breakdownV2_(input));
    if(input.action==='report'||input.action==='reportV2') {
      if(!Array.isArray(input.projects)||input.projects.length>30) throw Error('Invalid project list');
      var end=new Date();end.setUTCDate(end.getUTCDate()-(input.action==='reportV2'?1:3));end=new Date(end.toISOString().slice(0,10)+'T00:00:00Z');
      var dates=Array.from({length:180},function(_,i){return new Date(end.getTime()-(179-i)*86400000).toISOString().slice(0,10);});
      return json_({ok:true,reports:input.projects.map(function(p){return report_(p,dates,input.action==='reportV2');})});
    }
    throw Error('Unknown operation');
  } catch(err) { return json_({ok:false,error:String(err.message||err).slice(0,1000)}); }
}
function json_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function google_(url,body){
 var options={headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true};
 if(body){options.method='post';options.contentType='application/json';options.payload=JSON.stringify(body);}
 var r=UrlFetchApp.fetch(url,options);var data=JSON.parse(r.getContentText());
 if(r.getResponseCode()>=400)throw Error((data.error&&data.error.message)||('Google HTTP '+r.getResponseCode()));return data;
}
function discover_(){
 var ga=[],gsc=[],warnings=[];
 try{var page;do {var result=AnalyticsAdmin.AccountSummaries.list({pageSize:200,pageToken:page});(result.accountSummaries||[]).forEach(function(a){(a.propertySummaries||[]).forEach(function(p){ga.push({id:p.property,name:p.displayName+' · '+p.property});});});page=result.nextPageToken;}while(page);}catch(e){warnings.push('GA4: '+e.message);}
 try{var result=google_('https://www.googleapis.com/webmasters/v3/sites');gsc=(result.siteEntry||[]).filter(function(s){return s.permissionLevel!=='siteUnverifiedUser';}).map(function(s){return {id:s.siteUrl,name:s.siteUrl};});}catch(e){warnings.push('Search Console: '+e.message);}
 if(!ga.length&&!gsc.length&&warnings.length)throw Error(warnings.join('\n'));
 return {ok:true,ga:ga,gsc:gsc,warnings:warnings};
}
function report_(p,dates,fresh){
 if(typeof p.id!=='string'||(p.ga&&!/^properties\/\d+$/.test(p.ga))||(p.gsc&&!/^sc-domain:|^https?:\/\//.test(p.gsc)))throw Error('Invalid project');
 var days=dates.map(function(d){return {date:d,sessions:null,clicks:null,impressions:null};});var errors=[],freshness={};
 if(p.ga)try{
 var r=AnalyticsData.Properties.runReport({dateRanges:[{startDate:dates[0],endDate:dates[179]}],dimensions:[{name:'date'}],metrics:[{name:'sessions'}],limit:1000,keepEmptyRows:true},p.ga);
 freshness.gaThrough=dates[179];if(r.metadata&&r.metadata.timeZone)freshness.gaTimezone=r.metadata.timeZone;
 if(r.metadata&&r.metadata.subjectToThresholding)errors.push('GA4: Google applies privacy thresholds; some data may be hidden.');
 days.forEach(function(d){d.sessions=0;});(r.rows||[]).forEach(function(row){var raw=row.dimensionValues[0].value;var date=raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8);var d=days.find(function(x){return x.date===date;});if(d)d.sessions=Number(row.metricValues[0].value);});
 }catch(e){errors.push('GA4: '+e.message);}
 if(p.gsc)try{
 var r=google_('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(p.gsc)+'/searchAnalytics/query',{startDate:dates[0],endDate:dates[179],dimensions:['date'],type:'web',dataState:fresh?'all':'final',rowLimit:1000});
 var last=(r.rows||[]).map(function(row){return row.keys[0];}).sort().pop();
 var cutoff=new Date();cutoff.setUTCDate(cutoff.getUTCDate()-3);cutoff=cutoff.toISOString().slice(0,10);
 freshness.gscThrough=fresh?(last||cutoff):dates[179];
 if(r.metadata&&r.metadata.first_incomplete_date)freshness.firstIncompleteDate=r.metadata.first_incomplete_date;
 days.forEach(function(d){if(d.date<=freshness.gscThrough){d.clicks=0;d.impressions=0;}});(r.rows||[]).forEach(function(row){var d=days.find(function(x){return x.date===row.keys[0];});if(d){d.clicks=Number(row.clicks);d.impressions=Number(row.impressions);}});
 }catch(e){errors.push('Search Console: '+e.message);}
 return {id:p.id,endDate:dates[179],days:days,errors:errors,freshness:freshness};
}

// V2 breakdowns use the existing read-only authorization. Original report action stays compatible.
function breakdownV2_(input){
 var dimensions={channels:'sessionDefaultChannelGroup',referrers:'sessionSourceMedium',campaigns:'sessionCampaignName',pages:'pagePath',landing:'landingPagePlusQueryString',countries:'country'};
 if(!Array.isArray(input.projects)||input.projects.length>30||[7,28,90].indexOf(input.days)<0||!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)||(!dimensions[input.kind]&&input.kind!=='queries'))throw Error('Invalid breakdown');
 var end=new Date(input.endDate+'T00:00:00Z');if(isNaN(end.getTime())||end>new Date())throw Error('Invalid date');
 var start=new Date(end.getTime()-(input.days-1)*86400000).toISOString().slice(0,10),rows=[],errors=[];
 input.projects.forEach(function(p){
  if(typeof p.id!=='string'||(p.ga&&!/^properties\/\d+$/.test(p.ga))||(p.gsc&&!/^sc-domain:|^https?:\/\//.test(p.gsc)))throw Error('Invalid project');
  try{
   if(input.kind==='queries'){
    if(!p.gsc)return;
    var r=google_('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(p.gsc)+'/searchAnalytics/query',{startDate:start,endDate:input.endDate,dimensions:['query'],type:'web',dataState:'all',rowLimit:30});
    (r.rows||[]).forEach(function(row){rows.push({label:row.keys[0],value:Number(row.clicks),impressions:Number(row.impressions),project:p.id});});
   }else{
    if(!p.ga)return;
    var metric=input.kind==='pages'?'screenPageViews':'sessions';
    var dimensionList=input.kind==='pages'||input.kind==='landing'?[{name:'hostName'},{name:dimensions[input.kind]}]:[{name:dimensions[input.kind]}];
    var r=AnalyticsData.Properties.runReport({dateRanges:[{startDate:start,endDate:input.endDate}],dimensions:dimensionList,metrics:[{name:metric}],orderBys:[{metric:{metricName:metric},desc:true}],limit:30},p.ga);
    if(r.metadata&&r.metadata.subjectToThresholding)errors.push(p.id+': privacy thresholds may hide rows.');
    (r.rows||[]).forEach(function(row){rows.push({label:row.dimensionValues.map(function(d){return d.value;}).join(''),value:Number(row.metricValues[0].value),project:p.id});});
   }
  }catch(e){errors.push(p.id+': '+String(e.message||e).slice(0,800));}
 });
 return {ok:true,rows:rows,errors:errors};
}
