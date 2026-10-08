/* Prüft alle HTML-Seiten: Titel/Description/Canonical/H1, doppelte IDs, interne Links, Anker, Bilder (alt), JSON-LD, Sitemap.
   Aufruf: node scripts/audit-links.js */
const fs=require('fs'),path=require('path');
const ROOT=require('path').join(__dirname,'..');
const pages=[];(function w(d){for(const f of fs.readdirSync(d)){if(['node_modules','.git','scripts'].includes(f))continue;const p=path.join(d,f);fs.statSync(p).isDirectory()?w(p):f.endsWith('.html')&&pages.push(p)}})(ROOT);
const issues=[];const ids={};
const html={};for(const p of pages){html[p]=fs.readFileSync(p,'utf8');ids[p]=new Set([...html[p].matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));}
const resolve=(from,href)=>{let u=href.split('#')[0].split('?')[0];if(!u)return from;if(u.startsWith('/'))u=path.join(ROOT,u);else u=path.join(path.dirname(from),u);if(fs.existsSync(u)&&fs.statSync(u).isDirectory())u=path.join(u,'index.html');return u};
for(const p of pages){const h=html[p],rel=path.relative(ROOT,p);
 const t=[...h.matchAll(/<title>(.*?)<\/title>/g)];if(t.length!==1)issues.push(rel+': title count '+t.length);
 if(!/<meta name="description"/.test(h))issues.push(rel+': keine description');
 if(!/rel="canonical"/.test(h)&&!/noindex/.test(h))issues.push(rel+': kein canonical');
 const h1=(h.match(/<h1[ >]/g)||[]).length;if(h1!==1)issues.push(rel+': h1 count '+h1);
 const idl=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);const dup=idl.filter((x,i)=>idl.indexOf(x)!==i);if(dup.length)issues.push(rel+': doppelte ids '+dup);
 for(const m of h.matchAll(/<(?:a|link|script|img|source)\b[^>]*?(?:href|src)="([^"]+)"/g)){const href=m[1];
  if(/^(https?:|mailto:|tel:|data:|javascript:)/.test(href))continue;
  const tgt=resolve(p,href);if(!fs.existsSync(tgt)){issues.push(rel+': kaputt '+href);continue}
  const a=href.split('#')[1];if(a&&tgt.endsWith('.html')&&!ids[tgt]?.has(a)&&html[tgt])issues.push(rel+': Anker fehlt '+href)}
 for(const m of h.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g))issues.push(rel+': img ohne alt');
 for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){try{JSON.parse(m[1])}catch(e){issues.push(rel+': JSON-LD kaputt')}}
 for(const m of h.matchAll(/\bfor="([^"]+)"/g))if(!idl.includes(m[1]))issues.push(rel+': label for='+m[1]);
}
const sm=fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8');for(const m of sm.matchAll(/<loc>https:\/\/www\.taxi-wilck\.de([^<]*)<\/loc>/g)){if(!fs.existsSync(resolve(ROOT+'/x',m[1])))issues.push('sitemap: '+m[1])}
const titles={};for(const p of pages){const t=html[p].match(/<title>(.*?)<\/title>/)?.[1];(titles[t]??=[]).push(p)}
for(const [t,l] of Object.entries(titles))if(l.length>1)issues.push('doppelter Titel: '+t);
console.log(pages.length,'Seiten');console.log(issues.length?issues.join('\n'):'keine Probleme');
