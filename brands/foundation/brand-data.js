/* Illawarra Hawks Foundation: brand rules. Colours, approved pairings, logo colourways and helpers
   the engine reads. Change the brand here, not in engine/. */

/* ---------- the rules: one source of truth, reused by the Stage 2 studio ---------- */
const C = {
  crimson:{name:"Classic Crimson",hex:"#cb223a",rgb:"203 / 34 / 58",cmyk:"15 / 100 / 82 / 5"},
  navy:{name:"Oxford Navy",hex:"#162e49",rgb:"22 / 46 / 73",cmyk:"70 / 37 / 0 / 71"},
  parchment:{name:"Parchment Cream",hex:"#f2e7d2",rgb:"242 / 231 / 210",cmyk:"0 / 5 / 13 / 5"},
  grey:{name:"Light Grey",hex:"#f2f2f2",rgb:"242 / 242 / 242",cmyk:"0 / 0 / 0 / 5"},
  white:{name:"White",hex:"#ffffff",rgb:null,cmyk:null}
};
const BRAND = {name:"Illawarra Hawks Foundation",
  roles:{lead:"crimson",ink:"navy",soft:"parchment",neutral:"grey",base:"white"},
  fonts:{title:'"Libre Baskerville"',body:'"Open Sans"'}};
for(const r in BRAND.roles) host.style.setProperty("--"+r,C[BRAND.roles[r]].hex);
const inkOn = k => C[ratio(k,BRAND.roles.base)>=ratio(k,BRAND.roles.ink)?BRAND.roles.base:BRAND.roles.ink].hex;
const ORDER = ["crimson","navy","parchment","grey","white"];
const TEXT_COLOURS = ["navy","crimson","parchment","white"];
const short = k => C[k].name.replace("Classic ","").replace("Oxford ","").replace(" Cream","");
function lum(hex){
  const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4));
  return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];
}
function ratio(a,b){const x=lum(C[a].hex),y=lum(C[b].hex);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
const fmt = r => (Math.floor(r*100)/100).toFixed(2)+":1";   // round down, so 4.48 never shows as 4.5

/* Pairings the draft ticks as approved (text on background). */
const DRAFT_OK = {
  h:{navy:["parchment","white"],crimson:["parchment","white"],parchment:["navy","crimson"],grey:["navy","crimson"],white:["navy","crimson"]},
  p:{navy:["parchment","white"],crimson:["parchment","white"],parchment:["navy"],grey:["navy","crimson"],white:["navy","crimson"]}
};

/* Logo colourways: [background, mark] or for the seal [background, disc, artwork]. d = shown in the draft. */
const ONE = [
  ["white","crimson",true],["parchment","crimson"],["grey","crimson"],
  ["crimson","parchment"],["crimson","white"],
  ["navy","parchment"],["navy","white"],
  ["white","navy"],["parchment","navy"]
];
const VARIANTS = [
  {id:"seal",name:"Seal",role:"Primary logo",tag:"draft",
   use:"A simplified hawk in a seal of quality. For social avatars, apparel embroidery, official certificates and formal event signage.",
   ways:[["white","crimson","parchment",true],["parchment","crimson","parchment"],["crimson","parchment","crimson"],
         ["grey","crimson","parchment"],["navy","parchment","navy"],["navy","parchment","crimson"],["white","navy","parchment"],["parchment","navy","parchment"]]},
  {id:"lockup",name:"Wordmark with hawk",role:"Secondary logo",tag:"sugg",
   use:"Website and email headers, letterhead, partner logo strips. The draft shows this mark but gives it no usage rule.",ways:ONE},
  {id:"wordmark",name:"Wordmark",role:"Secondary logo",tag:"sugg",
   use:"Narrow spaces where the hawk would be too small, or next to the seal so the hawk is not shown twice.",ways:ONE},
  {id:"stacked",name:"Stacked",role:"Shown in draft, unnamed",tag:"sugg",
   use:"Covers, title slides, posters and other centred layouts.",ways:ONE}
];
