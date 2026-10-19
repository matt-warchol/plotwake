// Plotwake. Read-only GA4 and Search Console reports.
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PULSE_KEY')) props.setProperty('PULSE_KEY', Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,''));
  console.log('Connection key (paste only into your private dashboard): ' + props.getProperty('PULSE_KEY'));
  // Requests authorization before deployment. Never return the Google OAuth token.
  ScriptApp.getOAuthToken();
}
function doGet() { return json_({ok:false,error:'Plotwake: use the protected POST connection.'}); }
function doPost(e) {
  try {
    var input=JSON.parse(e.postData.contents||'{}');
    var key=PropertiesService.getScriptProperties().getProperty('PULSE_KEY');
    if(!key || input.secret!==key) return json_({ok:false,error:'Invalid connection key.'});
    if(input.action==='discover') return json_(discover_());
    if(input.action==='report') {
      if(!Array.isArray(input.projects)||input.projects.length>30) throw Error('Invalid project list');
      var end=new Date();end.setUTCDate(end.getUTCDate()-3);end=new Date(end.toISOString().slice(0,10)+'T00:00:00Z');
      var dates=Array.from({length:180},function(_,i){return new Date(end.getTime()-(179-i)*86400000).toISOString().slice(0,10);});
      return json_({ok:true,reports:input.projects.map(function(p){return report_(p,dates);})});
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
function report_(p,dates){
 if(typeof p.id!=='string'||(p.ga&&!/^properties\/\d+$/.test(p.ga))||(p.gsc&&!/^sc-domain:|^https?:\/\//.test(p.gsc)))throw Error('Invalid project');
 var days=dates.map(function(d){return {date:d,sessions:null,clicks:null,impressions:null};});var errors=[];
 if(p.ga)try{
 var r=AnalyticsData.Properties.runReport({dateRanges:[{startDate:dates[0],endDate:dates[179]}],dimensions:[{name:'date'}],metrics:[{name:'sessions'}],limit:1000,keepEmptyRows:true},p.ga);
 if(r.metadata&&r.metadata.subjectToThresholding)errors.push('GA4: Google applies privacy thresholds; some data may be hidden.');
 days.forEach(function(d){d.sessions=0;});(r.rows||[]).forEach(function(row){var raw=row.dimensionValues[0].value;var date=raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8);var d=days.find(function(x){return x.date===date;});if(d)d.sessions=Number(row.metricValues[0].value);});
 }catch(e){errors.push('GA4: '+e.message);}
 if(p.gsc)try{
 var r=google_('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(p.gsc)+'/searchAnalytics/query',{startDate:dates[0],endDate:dates[179],dimensions:['date'],type:'web',dataState:'final',rowLimit:1000});
 days.forEach(function(d){d.clicks=0;d.impressions=0;});(r.rows||[]).forEach(function(row){var d=days.find(function(x){return x.date===row.keys[0];});if(d){d.clicks=Number(row.clicks);d.impressions=Number(row.impressions);}});
 }catch(e){errors.push('Search Console: '+e.message);}
 return {id:p.id,endDate:dates[179],days:days,errors:errors};
}
