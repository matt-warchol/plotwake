import {readFileSync,writeFileSync} from 'node:fs';
import {feature} from 'topojson-client';
import {geoArea,geoCentroid,geoContains} from 'd3-geo';
import countries from 'i18n-iso-countries';

const world=JSON.parse(readFileSync(new URL('../src/world-110m.json',import.meta.url),'utf8'));
const shapes=feature(world,world.objects.features).features.filter(shape=>shape.properties.id!=='ATA');
const collection={type:'FeatureCollection',features:shapes};
const dots=[];
for(let lat=-55;lat<=80;lat+=4){
 for(let lon=-180;lon<180;lon+=4){if(geoContains(collection,[lon,lat]))dots.push([lon,lat]);}
}
const centers={};
for(const shape of shapes){
 const code=countries.alpha3ToAlpha2(shape.properties.id);
 if(!code)continue;
 const mainland=shape.geometry.type==='MultiPolygon'
  ?shape.geometry.coordinates.map(coordinates=>({type:'Polygon',coordinates})).sort((a,b)=>geoArea(b)-geoArea(a))[0]
  :shape;
 centers[code]=geoCentroid(mainland).map(value=>Math.round(value*100)/100);
}
const output={source:'@d3-maps/atlas 1.0.0 countries-110m',dots,centers};
writeFileSync(new URL('../src/world-points.json',import.meta.url),JSON.stringify(output)+'\n');
console.log(`Generated ${dots.length} land dots and ${Object.keys(centers).length} country centers.`);
