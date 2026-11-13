/* Brand hub engine: guide interactions and the post studio. Brand-neutral: it reads the rules
   defined in a brand's brand-data.js. Runs inside the embed wrapper, which supplies
   root (shadow root), host (mount element), LOGOS and opts. */
/* ---------- helpers ---------- */
const $ = s => root.querySelector(s);
const el = (t,a={},h="") => {const e=document.createElement(t);for(const k in a){if(k==="style")e.style.cssText=a[k];else e.setAttribute(k,a[k]);}e.innerHTML=h;return e;};
let toastT;
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600);}
async function copy(text,label){
  try{await navigator.clipboard.writeText(text);toast("Copied "+label);}
  catch(e){
    const ta=el("textarea");ta.value=text;ta.style.cssText="position:fixed;left:16px;right:16px;bottom:70px;height:90px;z-index:30;font:13px monospace";
    root.appendChild(ta);ta.select();toast("Press Ctrl or Cmd + C to copy");
    ta.addEventListener("blur",()=>ta.remove(),{once:true});
  }
}

/* Logos arrive as vector paths. Build the SVG for a mark in the given colours (used for the
   SVG download), and from the same paths a black-only SVG for each layer, used as a mask. */
function svgOf(L,fills){
  let body="";
  for(const k of ["a","b"]){
    const lay=L.paths[k]; if(!lay||!fills[k]) continue;
    if(lay.d) body+=`<path d="${lay.d}" fill="${fills[k]}"/>`;
    (lay.s||[]).forEach(s=>body+=`<path d="${s.d}" fill="none" stroke="${fills[k]}" stroke-width="${s.w}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.vb[0]} ${L.vb[1]}" width="${L.w}" height="${L.h}">${body}</svg>`;
}
for(const k in LOGOS){
  const L=LOGOS[k];L.paths={a:L.a,b:L.b};
  L.a="data:image/svg+xml;base64,"+btoa(svgOf(L,{a:"#000"}));
  L.b=L.paths.b?"data:image/svg+xml;base64,"+btoa(svgOf(L,{b:"#000"})):undefined;
}

/* mask classes for the logo layers */
(function(){
  let css="";
  for(const k in LOGOS){
    css+=`.mk-${k}-a{-webkit-mask:url(${LOGOS[k].a}) center/contain no-repeat;mask:url(${LOGOS[k].a}) center/contain no-repeat}`;
    if(LOGOS[k].b) css+=`.mk-${k}-b{-webkit-mask:url(${LOGOS[k].b}) center/contain no-repeat;mask:url(${LOGOS[k].b}) center/contain no-repeat}`;
  }
  root.appendChild(el("style",{},css));
})();
function paintMark(node,id,fg,fg2){
  node.style.aspectRatio=LOGOS[id].w+" / "+LOGOS[id].h;
  node.innerHTML=`<i class="mk-${id}-a" style="background:${C[fg].hex}"></i>`+(fg2?`<i class="mk-${id}-b" style="background:${C[fg2].hex}"></i>`:"");
}
paintMark($("#heroSeal"),"seal","parchment","crimson");

/* ---------- logos ---------- */
/* Ordinary browser download: build a temporary link to the file and click it. */
const downloads={save:({filename,data})=>new Promise(done=>{
  const url=URL.createObjectURL(data),a=document.createElement("a");
  a.href=url;a.download=filename;a.style.display="none";document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url);done();},1500);
})};
const wayLabel = (v,w) => v.id==="seal"
  ? `${short(w[1])} seal, ${short(w[2])} artwork, on ${short(w[0])}`
  : `${short(w[1])} on ${short(w[0])}`;
const waySlug = (v,w) => ["ihf",v.id,...(v.id==="seal"?[w[1],w[2]]:[w[1]]),"on",w[0]].join("-");
VARIANTS.forEach(v=>{
  const card=el("div",{class:"logo-card"});
  const stage=el("div",{class:"stage"});
  const mark=el("div",{class:"mark",role:"img","aria-label":v.name});
  const tall=LOGOS[v.id].h/LOGOS[v.id].w>0.6;
  mark.style.cssText=tall?"height:72%":"width:72%";
  stage.appendChild(mark);
  const dots=el("div",{class:"dots",role:"group","aria-label":v.name+" colourways"});
  const way=el("div",{class:"way"});
  const btns=el("div",{class:"btns"});
  const png=el("button",{type:"button",class:"btn primary"},"Download PNG");
  const svg=el("button",{type:"button",class:"btn secondary"},"Download SVG");
  png.dataset.dl="1"; png.hidden=true; svg.dataset.dl="1"; svg.hidden=true;
  btns.append(png,svg);
  let cur=v.ways[0];
  function pick(w,btn){
    cur=w; stage.style.backgroundColor=C[w[0]].hex;
    if(v.id==="seal") paintMark(mark,"seal",w[1],w[2]); else paintMark(mark,v.id,w[1]);
    dots.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b===btn));
    const inDraft=w[w.length-1]===true;
    const r=v.id==="seal"?ratio(w[1],w[2]):ratio(w[0],w[1]);
    way.innerHTML=`<span>${wayLabel(v,w)}</span><span class="muted">${fmt(r)}</span>`;
  }
  v.ways.forEach((w,i)=>{
    const b=el("button",{type:"button",class:"dot","aria-label":wayLabel(v,w),"aria-pressed":"false",title:wayLabel(v,w)},
      `<span style="background:${C[w[0]].hex}"></span><span style="background:${C[w[1]].hex}"></span>`+(v.id==="seal"?`<span style="background:${C[w[2]].hex};border-radius:50%"></span>`:""));
    b.addEventListener("click",()=>pick(w,b));
    dots.appendChild(b);
    if(i===0) pick(w,b);
  });
  png.addEventListener("click",async()=>{
    if(!downloads) return;
    try{
      const blob=await renderPng(v.id,cur[1],v.id==="seal"?cur[2]:null);
      await downloads.save({filename:waySlug(v,cur)+".png",data:blob});
      toast("Download started");
    }catch(e){
      if(e&&e.code==="declined") return;
      toast(e&&e.code==="rate_limited"?"Finish the open save prompt first":"Download is not available in this view");
    }
  });
  svg.addEventListener("click",async()=>{
    if(!downloads) return;
    try{
      const fills={a:C[cur[1]].hex};if(v.id==="seal")fills.b=C[cur[2]].hex;
      await downloads.save({filename:waySlug(v,cur)+".svg",data:new Blob([svgOf(LOGOS[v.id],fills)],{type:"image/svg+xml"})});
      toast("Download started");
    }catch(e){
      if(e&&e.code==="declined") return;
      toast(e&&e.code==="rate_limited"?"Finish the open save prompt first":"Download is not available in this view");
    }
  });
  card.append(
    el("div",{},`<h3>${v.name}</h3><div class="small muted">${v.role}</div>`),
    stage,dots,way,el("p",{class:"small"},v.use),btns);
  $("#logoGrid").appendChild(card);
});
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
async function tinted(src,w,h,hex){
  const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");
  x.drawImage(await loadImg(src),0,0,w,h);x.globalCompositeOperation="source-in";x.fillStyle=hex;x.fillRect(0,0,w,h);return c;
}
async function renderPng(id,fg,fg2){
  const L=LOGOS[id],c=document.createElement("canvas");c.width=L.w;c.height=L.h;const x=c.getContext("2d");
  x.drawImage(await tinted(L.a,L.w,L.h,C[fg].hex),0,0);
  if(fg2) x.drawImage(await tinted(L.b,L.w,L.h,C[fg2].hex),0,0);
  return new Promise(r=>c.toBlob(r,"image/png"));
}
root.querySelectorAll("[data-dl]").forEach(b=>b.hidden=false);

/* ---------- colour ---------- */
ORDER.forEach(k=>{
  const c=C[k],ink=inkOn(k);
  const s=el("div",{class:"sw"});
  const b=el("button",{type:"button",class:"chip",style:`background:${c.hex};color:${ink}`,"aria-label":`Copy ${c.name} ${c.hex}`},"Copy HEX");
  b.addEventListener("click",()=>copy(c.hex,c.hex));
  s.append(b,el("b",{},c.name),el("dl",{},`<dt>HEX</dt><dd>${c.hex}</dd>`+(c.rgb?`<dt>RGB</dt><dd>${c.rgb}</dd><dt>CMYK</dt><dd>${c.cmyk}</dd>`:`<dt>RGB</dt><dd class="muted">not in draft</dd>`)));
  $("#swatches").appendChild(s);
});
[["white",40],["parchment",20],["crimson",25],["navy",10],["grey",5]].forEach(([k,p])=>{
  const ink=inkOn(k);
  $("#bar").appendChild(el("div",{style:`width:${p}%;background:${C[k].hex};color:${ink}`},p>=10?p+"%":""));
  $("#barkey").appendChild(el("span",{},`<b>${p}%</b> ${C[k].name}`));
});

/* ---------- pairings ---------- */
let bg="crimson",size="p";
ORDER.forEach(k=>{
  const b=el("button",{type:"button","data-bg":k,"aria-pressed":k===bg},`<i style="background:${C[k].hex}"></i>${short(k)}`);
  b.addEventListener("click",()=>{bg=k;drawPairs();});
  $("#bgSeg").appendChild(b);
});
$("#sizeSeg").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{size=b.dataset.size;drawPairs();}));
function drawPairs(){
  $("#bgSeg").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.bg===bg));
  $("#sizeSeg").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.size===size));
  const need=size==="p"?4.5:3, box=$("#pairs"); box.innerHTML="";
  const notes=[];
  TEXT_COLOURS.filter(t=>t!==bg).forEach(t=>{
    const r=ratio(bg,t),ok=r>=need,draft=DRAFT_OK[size][bg].includes(t);
    const d=el("div",{class:"pair"+(ok?"":" blocked")});
    d.innerHTML=`<div class="demo" style="background:${C[bg].hex};color:${C[t].hex}">`+
      (size==="h"?`<div class="h">Community impact</div>`:`<div class="p">Investing in people, programs and places across the Illawarra.</div>`)+`</div>`+
      `<div class="meta"><span><b>${short(t)}</b> on ${short(bg)}</span><span><b>${fmt(r)}</b> <span class="muted">needs ${need}:1</span></span>`+
      `<span class="verdict ${ok?"y":"n"}">${ok?"Use it":"Do not use"}</span></div>`;
    box.appendChild(d);
    if(draft&&!ok) notes.push(`<b>The draft ticks ${short(t)} text on ${short(bg)} at this size, but it measures ${fmt(r)}</b>, just under the ${need}:1 needed. It is the same pair the draft already bans the other way round, so the contrast is identical. Use White instead.`);
    if(!draft&&ok&&r<21) notes.push(`${short(t)} on ${short(bg)} passes at ${fmt(r)} but is not one of the draft's ticked pairings. It is offered here as a suggestion.`);
  });
  const n=$("#pairNote"); n.hidden=!notes.length; n.innerHTML=notes.join("<br><br>");
  n.style.borderLeftColor=notes.some(x=>x.startsWith("<b>"))?"var(--no)":"var(--ink)";
}
drawPairs();

/* ---------- type ---------- */
const SCALE=[
  ["Title","serif",400,"normal",42,56,1.15],["Heading","serif",400,"normal",32,43,1.2],
  ["Subtitle","sans",400,"normal",24,32,1.3],["Section header","sans",400,"normal",20,27,1.35],
  ["Subheading","sans",700,"normal",12,16,1.5],["Body","sans",400,"normal",12,16,1.6],
  ["Quote","serif",400,"normal",12,16,1.6],["Caption","serif",400,"italic",10,13,1.5]
];
function drawScale(){
  const txt=$("#tt").value||"Stronger, healthier, more connected communities", box=$("#scale"); box.innerHTML="";
  SCALE.forEach(([role,fam,w,st,pt,px,lh])=>{
    const r=el("div",{class:"row"});
    const s=el("div",{class:"sample",style:`font-family:var(--${fam});font-weight:${w};font-style:${st};font-size:min(${px}px,9vw);line-height:${lh}`});
    s.textContent=txt;
    r.append(el("div",{class:"role"},role),s,
      el("div",{class:"spec"},`${fam==="serif"?"Libre Baskerville":"Open Sans"} ${w===700?"Bold":st==="italic"?"Italic":"Regular"}<br>${pt} pt &middot; ${px} px &middot; line height ${lh}`));
    box.appendChild(r);
  });
}
$("#tt").addEventListener("input",drawScale); drawScale();

/* ---------- studio: a square post builder that reads the same rules ---------- */
const FORMATS={
  square:{name:"Square",w:1080,h:1080,f:1,p:96,note:"1080 by 1080"},
  landscape:{name:"Landscape",w:1600,h:900,f:1.15,p:72,note:"1600 by 900"},
  portrait:{name:"Portrait",w:1080,h:1350,f:1,p:96,note:"1080 by 1350 (4:5)"}
};
let shape="square";
const FONT={title:BRAND.fonts.title+", Georgia, serif",body:BRAND.fonts.body+", Arial, sans-serif"};
const SIZE={l:112,m:92,s:76}, MIN_BIG=72;   /* 72 px on a 1080 canvas is 24 px when shown at phone width, the heading-size floor */
const SPEC={small:{px:30,lh:1.3,gap:26,kind:"p",label:"small line"},big:{lh:1.14,gap:34,kind:"h",label:"big line"},
            details:{px:34,lh:1.45,gap:38,kind:"p",label:"details"},cta:{px:30,lh:1.3,gap:0,kind:"p",label:"call to action"}};
const HEAD_PREF={crimson:["parchment","white"],navy:["parchment","white"],parchment:["navy","crimson"],grey:["crimson","navy"],white:["crimson","navy"]};
const BODY_PREF=["navy","white","parchment","crimson"];
const LAY={
  centred:{name:"Centred",logo:"seal",size:"m"},
  left:{name:"Left aligned",logo:"lockup",size:"l"},
  band:{name:"Band",logo:"lockup",size:"m",band:true},
  framed:{name:"Framed",logo:"seal",size:"m"},
  plate:{name:"Framed photo",logo:"lockup",size:"s",photo:true,items:["big"]},
  photoTop:{name:"Photo on top",logo:"lockup",size:"s",photo:true,only:["square","portrait"]},
  photoRight:{name:"Photo at right",logo:"lockup",size:"s",photo:true,only:["landscape"]},
  photoSide:{name:"Photo at left",logo:"lockup",size:"s",photo:true}
};
const SCHEMES=[{bg:"crimson",band:"navy"},{bg:"white",band:"crimson"},{bg:"parchment",band:"navy"},{bg:"navy",band:"crimson"},{bg:"grey",band:"navy"}];
const LOGO_NAMES={seal:"Seal",lockup:"Wordmark with hawk",wordmark:"Wordmark",stacked:"Stacked"};

const content={small:"",big:"",details:"",cta:"",caption:""};
const photo={img:null,nat:null,duo:null,style:"natural",zoom:1,x:0,y:0};
let mode="choose",shuffle=0,cur=null,tileStates=[],chooseBg=null;
const MASK={},tintCache={};
let lastPhoto=null,dragged=false;

function allowed(surface,kind){
  const need=kind==="h"?3:4.5, pref=kind==="h"?HEAD_PREF[surface].concat(TEXT_COLOURS):BODY_PREF;
  return [...new Set(pref)].filter(t=>t!==surface&&ratio(surface,t)>=need);
}
function logoWays(variant,surface){
  return variant==="seal"?VARIANTS[0].ways.filter(w=>w[0]===surface).map(w=>[w[1],w[2]]):ONE.filter(w=>w[0]===surface).map(w=>[w[1]]);
}
const shown=(st,el)=>!LAY[st.layout].items||LAY[st.layout].items.includes(el)||el==="cta";
const surfaceOf=(st,el)=>LAY[st.layout].band&&(el==="cta"||el==="logo")?st.band:st.bg;
function makeState(layout,sch){
  const st={layout,bg:sch.bg,band:sch.band,bigSize:LAY[layout].size,colors:{},logo:{variant:LAY[layout].logo,way:0}};
  for(const el in SPEC) st.colors[el]=allowed(surfaceOf(st,el),SPEC[el].kind)[0];
  return st;
}
/* After any change, move anything that no longer passes to the first colour that does. Returns what was changed. */
function enforce(st){
  const msgs=[];
  for(const el in SPEC){
    const sf=surfaceOf(st,el),ok=allowed(sf,SPEC[el].kind);
    if(!ok.includes(st.colors[el])){st.colors[el]=ok[0];if(content[el]&&shown(st,el))msgs.push(`Switched the ${SPEC[el].label} to ${short(ok[0])} so it reads on ${short(sf)}`);}
  }
  if(st.logo.way>=logoWays(st.logo.variant,surfaceOf(st,"logo")).length) st.logo.way=0;
  return msgs;
}

function prepPhoto(im){
  const max=2000,sc=Math.min(1,max/Math.max(im.width,im.height)),w=Math.round(im.width*sc),h=Math.round(im.height*sc);
  const mk=()=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c;};
  const nat=mk(),duo=mk(),nx=nat.getContext("2d"),dx=duo.getContext("2d");
  nx.drawImage(im,0,0,w,h);
  const src=nx.getImageData(0,0,w,h),d=src.data,out=dx.createImageData(w,h),o=out.data;
  const hex=k=>[1,3,5].map(i=>parseInt(C[BRAND.roles[k]].hex.slice(i,i+2),16)),A=hex("ink"),B=hex("soft");
  const hist=new Uint32Array(256);
  for(let i=0;i<d.length;i+=4) hist[Math.round(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])]++;
  const cut=(w*h)*0.01;let lo=0,hi=255,acc=0;
  for(;lo<255&&(acc+=hist[lo])<cut;lo++);acc=0;for(;hi>0&&(acc+=hist[hi])<cut;hi--);
  const span=Math.max(1,hi-lo),S=0.85;
  for(let i=0;i<d.length;i+=4){
    const l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2],t=Math.pow(Math.min(1,Math.max(0,(l-lo)/span)),0.9);
    o[i]=A[0]+(B[0]-A[0])*t;o[i+1]=A[1]+(B[1]-A[1])*t;o[i+2]=A[2]+(B[2]-A[2])*t;o[i+3]=255;
    d[i]=l+(d[i]-l)*S;d[i+1]=l+(d[i+1]-l)*S;d[i+2]=l+(d[i+2]-l)*S;
  }
  nx.putImageData(src,0,0);dx.putImageData(out,0,0);
  photo.nat=nat;photo.duo=duo;
}
function tint(id,layer,hex){
  const key=id+layer+hex; if(tintCache[key]) return tintCache[key];
  const L=LOGOS[id],c=document.createElement("canvas");c.width=L.w;c.height=L.h;const x=c.getContext("2d");
  x.drawImage(MASK[id][layer],0,0,L.w,L.h);x.globalCompositeOperation="source-in";x.fillStyle=hex;x.fillRect(0,0,L.w,L.h);
  return tintCache[key]=c;
}
function logoBox(variant,f){
  const L=LOGOS[variant],m={seal:{h:170},lockup:{w:400},wordmark:{w:360},stacked:{h:220}}[variant];
  return m.h?{w:m.h*L.w/L.h,h:m.h}:{w:m.w*f,h:m.w*f*L.h/L.w};
}
function setFont(ctx,el,bigPx){
  const px=el==="big"?bigPx:SPEC[el].px*FORMATS[shape].f;
  ctx.font=el==="big"?`400 ${px}px ${FONT.title}`:`${el==="details"?400:700} ${px}px ${FONT.body}`;
  if("letterSpacing" in ctx) ctx.letterSpacing=el==="small"?(4*FORMATS[shape].f)+"px":"0px";
  return px;
}
const textOf=el=>el==="small"?content.small.toUpperCase():content[el];
function wrap(ctx,text,maxW){
  const out=[];let wide=false;
  for(const para of String(text).split("\n")){
    let line="";
    for(const w of para.trim().split(/\s+/).filter(Boolean)){
      const t=line?line+" "+w:w;
      if(!line||ctx.measureText(t).width<=maxW) line=t; else {out.push(line);line=w;}
      if(ctx.measureText(line).width>maxW) wide=true;
    }
    if(line) out.push(line);
  }
  return {lines:out,wide};
}
function measure(ctx,items,w,bigPx){
  const parts=[];let total=0,wide=false;
  items.filter(el=>content[el].trim()).forEach(el=>{
    const px=setFont(ctx,el,bigPx),r=wrap(ctx,textOf(el),w),h=r.lines.length*px*SPEC[el].lh;
    parts.push({el,px,lines:r.lines,h}); if(r.wide) wide=true;
  });
  parts.forEach((p,i)=>{p.gap=SPEC[p.el].gap*FORMATS[shape].f;total+=p.h+(i<parts.length-1?p.gap:0);});
  return {parts,total,wide};
}
function drawLines(ctx,el,px,lines,x,top,align,hex){
  setFont(ctx,el,px);ctx.fillStyle=hex;ctx.textAlign=align;ctx.textBaseline="alphabetic";
  const lh=px*SPEC[el].lh;
  lines.forEach((ln,i)=>ctx.fillText(ln,x,top+i*lh+lh/2+px*0.34));
}
function draw(ctx,st,k){
  const issues=[],FM=FORMATS[shape],W=FM.w,H=FM.h,F=FM.f,P=FM.p,hasCta=!!content.cta.trim(),CAP=1100*F;
  let lb=logoBox(st.logo.variant,F);
  if(ctx.canvas.id==="stCanvas") lastPhoto=null;
  ctx.setTransform(k,0,0,k,0,0);
  ctx.fillStyle=C[st.bg].hex;ctx.fillRect(0,0,W,H);
  let box,align="left",mid=true,items=["small","big","details"],logoAt,ctaAt=null,photoRect=null;
  const capW=w=>Math.min(w,CAP);
  /* landscape with a tall logo: logo at the left, words beside it */
  const col=framed=>{const T=framed?P+40:P,lx=T+(framed?30:0),bx=lx+lb.w+80;
    logoAt={x:lx,y:(H-lb.h)/2};box={x:bx,y:T,w:Math.min(CAP,W-T-(framed?30:0)-bx),h:H-2*T};items.push("cta");};
  if(st.layout==="centred"&&W>H&&lb.h>180) col(false);
  else if(st.layout==="centred"){
    const bw=capW(W-2*P);
    box={x:(W-bw)/2,y:P+lb.h+44,w:bw,h:H-2*P-lb.h-44-(hasCta?80*F:0)};align="center";
    logoAt={x:W/2-lb.w/2,y:P};ctaAt={x:W/2,bottom:H-P,align:"center",w:W-2*P};
  }else if(st.layout==="left"){
    ctx.fillStyle=C[st.colors.big].hex;ctx.fillRect(P,P,84,6);
    mid=false;items.push("cta");
    if(W>H&&lb.h>100){box={x:P,y:P+52,w:capW(W-2*P-lb.w-60),h:H-2*P-52};logoAt={x:W-P-lb.w,y:H-P-lb.h};}
    else{box={x:P,y:P+52,w:capW(W-2*P),h:H-2*P-52-lb.h-44};logoAt={x:P,y:H-P-lb.h};}
  }else if(st.layout==="framed"){
    const I=P-52;
    ctx.strokeStyle=C[st.colors.big].hex;ctx.lineWidth=3;ctx.strokeRect(I,I,W-2*I,H-2*I);ctx.lineWidth=1;ctx.strokeRect(I+14,I+14,W-2*I-28,H-2*I-28);
    const T=P+40,bw=capW(W-2*T);
    if(W>H&&lb.h>100) col(true);
    else{box={x:(W-bw)/2,y:T,w:bw,h:H-2*T-lb.h-44};align="center";items.push("cta");logoAt={x:W/2-lb.w/2,y:H-T-lb.h};}
  }else if(st.layout==="band"){
    const bh=Math.min(300,Math.round(H*0.25));
    if(lb.h>bh-64){const sc=(bh-64)/lb.h;lb={w:lb.w*sc,h:lb.h*sc};}
    ctx.fillStyle=C[st.band].hex;ctx.fillRect(0,H-bh,W,bh);
    box={x:P,y:P,w:capW(W-2*P),h:H-bh-P-56};
    const side=W-2*P-lb.w-56;
    if(lb.h>100||!hasCta||side>=620){logoAt={x:P,y:H-bh+(bh-lb.h)/2};ctaAt={x:W-P,centre:H-bh/2,align:"right",w:side};}
    else{const g=30,ch=SPEC.cta.px*F*SPEC.cta.lh,top=H-bh+(bh-lb.h-g-ch)/2;logoAt={x:P,y:top};ctaAt={x:P,centre:top+lb.h+g+ch/2,align:"left",w:W-2*P};}
  }else if(st.layout==="plate"){
    const K=P-44,X=K+12,capH=content.caption.trim()?58*F:20;
    items=["big"];mid=false;
    if(W>H){
      const pw=Math.round(W*0.46);photoRect={x:X,y:X,w:pw,h:H-2*X-capH};
      const bx=X+pw+70;box={x:bx,y:P,w:W-P-bx,h:H-2*P-lb.h-44};mid=true;items.push("cta");logoAt={x:bx,y:H-P-lb.h};
    }else{
      const ph=Math.round(H*(H>W?0.6:0.52))-Math.max(0,lb.h-80);photoRect={x:X,y:X,w:W-2*X,h:ph};
      const y0=X+ph+capH+26;box={x:X,y:y0,w:W-2*X,h:H-y0-X-lb.h-36};
      logoAt={x:X,y:H-X-lb.h};ctaAt={x:W-X,bottom:H-X,align:"right",w:W-2*X-lb.w-40};
    }
    ctx.strokeStyle=C[st.colors.big].hex;ctx.lineWidth=2;ctx.strokeRect(photoRect.x-12,photoRect.y-12,photoRect.w+24,photoRect.h+24);
    if(content.caption.trim()){
      const px=26*F;ctx.font=`italic 400 ${px}px ${FONT.title}`;if("letterSpacing" in ctx)ctx.letterSpacing="0px";
      ctx.fillStyle=C[st.colors.details].hex;ctx.textAlign="left";ctx.textBaseline="alphabetic";
      if(ctx.measureText(content.caption).width>photoRect.w) issues.push("The photo caption is too long for this layout.");
      ctx.fillText(content.caption,photoRect.x,photoRect.y+photoRect.h+12+px*1.35);
    }
  }else if(st.layout==="photoTop"){
    const ph=Math.max(300,497-lb.h)+Math.round(Math.max(0,H-1080)*0.7),Q=80;photoRect={x:0,y:0,w:W,h:ph};
    box={x:Q,y:ph+52,w:W-2*Q,h:H-ph-52-Q-lb.h-36};mid=false;logoAt={x:W-Q-lb.w,y:H-Q-lb.h};
    ctaAt={x:Q,bottom:H-Q,align:"left",w:W-2*Q-lb.w-40};
  }else{
    const pw=W>H?Math.round(W*0.45):440,right=st.layout==="photoRight",x0=right?P:pw+64;
    photoRect={x:right?W-pw:0,y:0,w:pw,h:H};
    box={x:x0,y:80,w:W-pw-64-(right?P:64),h:H-160-lb.h-44};items.push("cta");logoAt={x:x0,y:H-80-lb.h};
  }
  if(lb.w>box.w&&(st.layout==="photoSide"||st.layout==="photoRight")){const sc=box.w/lb.w;lb={w:lb.w*sc,h:lb.h*sc};logoAt.y=H-80-lb.h;}
  if(photoRect&&photo.img){
    const im=(photo.style==="duo"?photo.duo:photo.nat)||photo.img,sc=Math.max(photoRect.w/im.width,photoRect.h/im.height)*photo.zoom,w=im.width*sc,h=im.height*sc;
    const sx=(w-photoRect.w)/2,sy=(h-photoRect.h)/2;
    if(ctx.canvas.id==="stCanvas") lastPhoto={r:photoRect,sx,sy};
    ctx.save();ctx.beginPath();ctx.rect(photoRect.x,photoRect.y,photoRect.w,photoRect.h);ctx.clip();
    ctx.drawImage(im,photoRect.x-sx-photo.x*sx,photoRect.y-sy-photo.y*sy,w,h);ctx.restore();
  }
  /* text block: shrink the big line until it fits, never below the heading-size floor */
  const minBig=MIN_BIG*F;let bigPx=SIZE[st.bigSize]*F,m=measure(ctx,items,box.w,bigPx);
  while((m.total>box.h||m.wide)&&bigPx>minBig){bigPx=Math.max(minBig,bigPx*0.95);m=measure(ctx,items,box.w,bigPx);}
  if(!content.big.trim()) issues.push("Add a big line. Every post needs one.");
  if(m.total>box.h||m.wide) issues.push(lb.h>100?"Too much text to fit with this logo. Shorten the words or choose a wider logo.":"Too much text to fit this layout. Shorten the big line or the details.");
  let y=mid?box.y+Math.max(0,(box.h-m.total)/2):box.y;
  const tx=align==="center"?box.x+box.w/2:box.x;
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  m.parts.forEach(p=>{drawLines(ctx,p.el,p.px,p.lines,tx,y,align,C[st.colors[p.el]].hex);y+=p.h+p.gap;});
  if(ctaAt&&hasCta){
    const px=setFont(ctx,"cta"),r=wrap(ctx,content.cta,ctaAt.w),lh=px*SPEC.cta.lh,h=r.lines.length*lh;
    if(r.wide||r.lines.length>2) issues.push("The call to action is too long for this layout.");
    const top=ctaAt.centre!==undefined?ctaAt.centre-h/2:ctaAt.bottom-h;
    drawLines(ctx,"cta",px,r.lines.slice(0,2),ctaAt.x,top,ctaAt.align,C[st.colors.cta].hex);
  }
  ctx.restore();
  /* logo */
  const ways=logoWays(st.logo.variant,surfaceOf(st,"logo")),way=ways[st.logo.way]||ways[0];
  if(!way) issues.push("That logo has no approved colourway on this background.");
  else{
    ctx.drawImage(tint(st.logo.variant,"a",C[way[0]].hex),logoAt.x,logoAt.y,lb.w,lb.h);
    if(way[1]) ctx.drawImage(tint(st.logo.variant,"b",C[way[1]].hex),logoAt.x,logoAt.y,lb.w,lb.h);
  }
  /* contrast: true by construction, checked anyway */
  for(const el in SPEC) if(content[el].trim()&&shown(st,el)){
    const sf=surfaceOf(st,el),need=SPEC[el].kind==="h"?3:4.5,r=ratio(sf,st.colors[el]);
    if(r<need) issues.push(`The ${SPEC[el].label} is ${fmt(r)} on ${short(sf)} and needs ${need}:1.`);
  }
  ctx.setTransform(1,0,0,1,0,0);
  return issues;
}

/* ----- choose a layout ----- */
function drawTiles(){
  const ids=Object.keys(LAY).filter(id=>(!LAY[id].photo||photo.img)&&(!LAY[id].only||LAY[id].only.includes(shape)));
  const FM=FORMATS[shape],tk=432/FM.w;
  const order=photo.img?ids.filter(i=>LAY[i].photo).concat(ids.filter(i=>!LAY[i].photo)):ids;
  const box=$("#stTiles");box.innerHTML="";tileStates=[];
  bgControl();$("#stShuffle").hidden=!!chooseBg;
  (chooseBg?[0]:[0,2]).forEach(off=>order.forEach((id,i)=>{
    const st=makeState(id,chooseBg?SCHEMES.find(x=>x.bg===chooseBg):SCHEMES[(i+off+shuffle)%SCHEMES.length]);tileStates.push(st);
    const b=el("button",{type:"button",class:"tile","aria-label":`${LAY[id].name} on ${short(st.bg)}`});
    const c=el("canvas",{width:432,height:Math.round(FM.h*tk)});c.style.aspectRatio=FM.w+" / "+FM.h;
    draw(c.getContext("2d"),st,tk);
    b.append(c,el("span",{},LAY[id].name));
    b.addEventListener("click",()=>openEditor(st));
    box.appendChild(b);
  }));
}
function setMode(m){
  mode=m;$(".studio").classList.toggle("editing",m==="edit");$("#stChoose").hidden=m!=="choose";$("#stEdit").hidden=m!=="edit";
  root.querySelectorAll("#studio .edit-only").forEach(e=>e.hidden=m!=="edit");
  $("#stPhotoCtl").hidden=!(m==="edit"&&photo.img&&cur&&LAY[cur.layout].photo);
  if(m==="choose") drawTiles();
}
function openEditor(st){cur=JSON.parse(JSON.stringify(st));setMode("edit");refresh();}

function setFormat(f){
  shape=f;const FM=FORMATS[f],cv=$("#stCanvas");
  cv.width=FM.w;cv.height=FM.h;cv.style.aspectRatio=FM.w+" / "+FM.h;$("#stStage").style.maxWidth=(FM.w>FM.h?760:FM.h>FM.w?500:620)+"px";
  $("#stFmt").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.shape===f));
  $("#stFmtNote").textContent=FM.note;
  $("#stTiles").classList.toggle("wide",FM.w>FM.h);
  if(cur&&LAY[cur.layout].only&&!LAY[cur.layout].only.includes(f)) cur.layout=cur.layout==="photoTop"?"photoRight":"photoTop";
  mode==="choose"?drawTiles():refresh();
}
Object.keys(FORMATS).forEach(f=>{
  const b=el("button",{type:"button",class:"pill","data-shape":f,"aria-pressed":f===shape},FORMATS[f].name);
  b.addEventListener("click",()=>setFormat(f));$("#stFmt").appendChild(b);
});
$("#stStyle").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
  photo.style=b.dataset.style;$("#stStyle").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));
  mode==="choose"?drawTiles():refresh();
}));
/* ----- drag the photo to position it ----- */
function placeGrab(){
  const g=$("#stGrab"),FM=FORMATS[shape];
  if(!lastPhoto){g.hidden=true;return;}
  const r=lastPhoto.r;g.hidden=false;
  g.style.left=(r.x/FM.w*100)+"%";g.style.top=(r.y/FM.h*100)+"%";g.style.width=(r.w/FM.w*100)+"%";g.style.height=(r.h/FM.h*100)+"%";
  $("#stGrabTip").hidden=dragged;
}
function photoMoved(){
  photo.x=Math.max(-1,Math.min(1,photo.x));photo.y=Math.max(-1,Math.min(1,photo.y));
  $("#stPx").value=photo.x;$("#stPy").value=photo.y;$("#stZoom").value=photo.zoom;
  draw($("#stCanvas").getContext("2d"),cur,1);placeGrab();
}
(function(){
  const g=$("#stGrab");let start=null,raf=0;
  g.addEventListener("pointerdown",e=>{
    if(!lastPhoto||!cur) return;
    g.setPointerCapture(e.pointerId);g.classList.add("grabbing");e.preventDefault();
    start={px:e.clientX,py:e.clientY,x:photo.x,y:photo.y,scale:FORMATS[shape].w/$("#stCanvas").getBoundingClientRect().width};
  });
  g.addEventListener("pointermove",e=>{
    if(!start||!lastPhoto) return;
    const dx=(e.clientX-start.px)*start.scale,dy=(e.clientY-start.py)*start.scale;
    if(lastPhoto.sx>0.5) photo.x=start.x-dx/lastPhoto.sx;
    if(lastPhoto.sy>0.5) photo.y=start.y-dy/lastPhoto.sy;
    if(Math.abs(dx)+Math.abs(dy)>4) dragged=true;
    if(!raf) raf=requestAnimationFrame(()=>{raf=0;photoMoved();});
  });
  const end=()=>{start=null;g.classList.remove("grabbing");};
  g.addEventListener("pointerup",end);g.addEventListener("pointercancel",end);
  g.addEventListener("dblclick",()=>{photo.x=0;photo.y=0;photo.zoom=1;photoMoved();});
  g.addEventListener("keydown",e=>{
    const step=e.shiftKey?0.2:0.05,k=e.key;
    if(k==="ArrowLeft")photo.x-=step;else if(k==="ArrowRight")photo.x+=step;else if(k==="ArrowUp")photo.y-=step;else if(k==="ArrowDown")photo.y+=step;
    else if(k==="+"||k==="=")photo.zoom=Math.min(3,photo.zoom+0.1);else if(k==="-")photo.zoom=Math.max(1,photo.zoom-0.1);else return;
    e.preventDefault();dragged=true;photoMoved();
  });
})();
/* ----- edit ----- */
function colourDot(key,on,ok,title,fn){
  const b=el("button",{type:"button",class:"dot"+(ok?"":" off"),"aria-pressed":on,"aria-label":title,title},`<span style="background:${C[key].hex}"></span>`);
  if(ok) b.addEventListener("click",fn); else b.setAttribute("aria-disabled","true");
  return b;
}
function bgControl(){
  const bg=$("#stBg");bg.innerHTML="";
  if(mode==="choose"){
    const any=el("button",{type:"button",class:"pill","aria-pressed":!chooseBg},"Any");
    any.addEventListener("click",()=>{chooseBg=null;drawTiles();});bg.appendChild(any);
    ORDER.forEach(k=>bg.appendChild(colourDot(k,chooseBg===k,true,short(k)+" background",()=>{chooseBg=k;drawTiles();})));
  }else ORDER.forEach(k=>bg.appendChild(colourDot(k,cur.bg===k,true,short(k)+" background",()=>{cur.bg=k;if(cur.band===k)cur.band=SCHEMES.find(x=>x.bg===k).band;refresh();})));
}
function refresh(){
  if(!cur) return;
  const msgs=enforce(cur);
  root.querySelectorAll("#studio [data-col]").forEach(row=>{
    const e=row.dataset.col,sf=surfaceOf(cur,e),ok=allowed(sf,SPEC[e].kind),need=SPEC[e].kind==="h"?"a heading":"small text";
    if(!shown(cur,e)){row.innerHTML='<span class="hint">Not shown in the '+LAY[cur.layout].name.toLowerCase()+' layout.</span>';return;}
    row.innerHTML='<span class="cap">Colour</span>';
    TEXT_COLOURS.filter(t=>t!==sf).forEach(t=>row.appendChild(colourDot(t,cur.colors[e]===t,ok.includes(t),
      ok.includes(t)?`${short(t)}, ${fmt(ratio(sf,t))} on ${short(sf)}`:`${short(t)} is ${fmt(ratio(sf,t))} on ${short(sf)}, too low for ${need}`,
      ()=>{cur.colors[e]=t;refresh();})));
  });
  $("#stSize").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.size===cur.bigSize));
  bgControl();
  $("#stBandFld").hidden=!LAY[cur.layout].band;
  const bd=$("#stBand");bd.innerHTML="";
  ["crimson","navy","parchment"].forEach(k=>bd.appendChild(colourDot(k,cur.band===k,k!==cur.bg,k!==cur.bg?short(k)+" band":"Same as the background",()=>{cur.band=k;refresh();})));
  const lv=$("#stLogoVar");lv.innerHTML="";
  Object.keys(LOGO_NAMES).forEach(v=>{
    const b=el("button",{type:"button",class:"pill","aria-pressed":cur.logo.variant===v},LOGO_NAMES[v]);
    b.addEventListener("click",()=>{cur.logo={variant:v,way:0};refresh();});lv.appendChild(b);
  });
  const lw=$("#stLogoWay"),sf=surfaceOf(cur,"logo");lw.innerHTML='<span class="cap">Colour</span>';
  logoWays(cur.logo.variant,sf).forEach((w,i)=>{
    const label=w.length>1?`${short(w[0])} seal, ${short(w[1])} artwork`:short(w[0]);
    const b=el("button",{type:"button",class:"dot","aria-pressed":cur.logo.way===i,"aria-label":label,title:label},
      `<span style="background:${C[w[0]].hex}"></span>`+(w[1]?`<span style="background:${C[w[1]].hex}"></span>`:""));
    b.addEventListener("click",()=>{cur.logo.way=i;refresh();});lw.appendChild(b);
  });
  $("#stPhotoCtl").hidden=!(photo.img&&LAY[cur.layout].photo);
  const issues=draw($("#stCanvas").getContext("2d"),cur,1);
  placeGrab();
  const badge=$("#stBadge");badge.className="badge "+(issues.length?"n":"y");badge.textContent=issues.length?"Needs a fix":"On brand";
  const ul=$("#stIssues");ul.hidden=!issues.length;ul.innerHTML=issues.map(i=>`<li>${i}</li>`).join("");
  $("#stDl").disabled=!!issues.length;
  if(msgs.length) toast(msgs[0]+(msgs.length>1?`, and ${msgs.length-1} more`:""));
}
let redrawT;
function contentChanged(){
  content.small=$("#stSmall").value;content.big=$("#stBig").value;content.details=$("#stDetails").value;content.cta=$("#stCta").value;content.caption=$("#stCaption").value;
  clearTimeout(redrawT);redrawT=setTimeout(()=>mode==="choose"?drawTiles():refresh(),90);
}
["stSmall","stBig","stDetails","stCta","stCaption"].forEach(id=>$("#"+id).addEventListener("input",contentChanged));
$("#stSize").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{cur.bigSize=b.dataset.size;refresh();}));
$("#stShuffle").addEventListener("click",()=>{shuffle=(shuffle+1)%SCHEMES.length;drawTiles();});
$("#stBack").addEventListener("click",()=>setMode("choose"));
["stZoom","stPx","stPy"].forEach(id=>$("#"+id).addEventListener("input",()=>{photo.zoom=+$("#stZoom").value;photo.x=+$("#stPx").value;photo.y=+$("#stPy").value;refresh();}));
$("#stPhoto").addEventListener("change",e=>{
  const f=e.target.files&&e.target.files[0]; if(!f) return;
  const im=new Image();
  im.onload=()=>{photo.img=im;try{prepPhoto(im);}catch(err){photo.nat=photo.duo=null;}photo.zoom=1;photo.x=0;photo.y=0;$("#stZoom").value=1;$("#stPx").value=0;$("#stPy").value=0;$("#stPhotoX").hidden=false;$("#stPhotoOpt").hidden=false;setMode("choose");toast("Photo added. Pick a photo layout.");};
  im.onerror=()=>toast("That file could not be read as an image. Try a JPG or PNG.");
  im.src=URL.createObjectURL(f);
});
$("#stPhotoX").addEventListener("click",()=>{photo.img=photo.nat=photo.duo=null;$("#stPhotoOpt").hidden=true;$("#stPhoto").value="";$("#stPhotoX").hidden=true;setMode("choose");});
$("#stDl").addEventListener("click",()=>{
  if(!downloads||$("#stDl").disabled) return;
  $("#stCanvas").toBlob(async blob=>{
    try{await downloads.save({filename:"ihf-post-"+shape+".png",data:blob});toast("Download started");}
    catch(e){if(e&&e.code==="declined")return;toast(e&&e.code==="rate_limited"?"Finish the open save prompt first":"Download is not available in this view");}
  },"image/png");
});
(async()=>{
  for(const k in LOGOS) MASK[k]={a:await loadImg(LOGOS[k].a),b:LOGOS[k].b?await loadImg(LOGOS[k].b):null};
  contentChanged();setMode("choose");setFormat("square");
  try{await Promise.all([document.fonts.load(`400 90px ${BRAND.fonts.title}`),document.fonts.load(`400 34px ${BRAND.fonts.body}`),document.fonts.load(`700 30px ${BRAND.fonts.body}`)]);}catch(e){}
  mode==="choose"?drawTiles():refresh();
})();


/* in-page links: anchors do not reach into a shadow root, so scroll by hand */
root.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{
  const t=root.querySelector(a.getAttribute("href")); if(!t) return;
  e.preventDefault();
  const y=t.getBoundingClientRect().top+window.scrollY-(opts.top||0)-52;
  window.scrollTo({top:y,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}));
/* nav highlight */
const links=[...root.querySelectorAll("nav.top a")];
if("IntersectionObserver" in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id));}),{rootMargin:"-45% 0px -50% 0px"});
  root.querySelectorAll("section[id]").forEach(s=>io.observe(s));
}

/* handle for automated tests; not used by the page itself */
host.__hub={draw,makeState,enforce,LAY,SCHEMES,FORMATS,LOGO_NAMES,photo,setFormat,ratio,fmt,
  get shape(){return shape;},set shape(v){shape=v;},get cur(){return cur;},get lastPhoto(){return lastPhoto;}};
