// Builds one brand's embed script: node engine/build.mjs <brand>
// Output: brands/<brand>/dist/<output> plus dist/preview.html for local testing.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = process.argv[2];
if (!brand) { console.error('Usage: node engine/build.mjs <brand>'); process.exit(1); }
const dir = join(root, 'brands', brand);
const read = (p) => readFileSync(p, 'utf8');
const cfg = JSON.parse(read(join(dir, 'brand.config.json')));
const pkg = JSON.parse(read(join(root, 'package.json')));

const css = read(join(root, 'engine', 'hub.css'));
const engine = read(join(root, 'engine', 'hub.js'));
const html = read(join(dir, 'content.html'));
const data = read(join(dir, 'brand-data.js'));
const logos = JSON.parse(read(join(dir, 'logos.json')));

const out = `/*! ${cfg.name} brand hub v${pkg.version}. Source: github.com/joelhawks7947/brand-hubs */
(function(){
  function start(){
    var mount=document.getElementById(${JSON.stringify(cfg.mountId)});
    if(!mount||mount.__hubMounted) return; mount.__hubMounted=true;
    if(!document.querySelector('link[data-brand-hub-fonts]')){
      var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(cfg.fonts)};l.setAttribute("data-brand-hub-fonts","");document.head.appendChild(l);
    }
    var top=parseInt(mount.getAttribute("data-top")||"0",10)||0;
    mount.style.setProperty("--hub-top",top+"px");
    var shadow=mount.attachShadow({mode:"open"});
    shadow.innerHTML="<style>"+${JSON.stringify(css)}+"</style>"+${JSON.stringify(html)};
    (function(root,host,LOGOS,opts){
${data}
${engine}
    })(shadow,mount,${JSON.stringify(logos)},{top:top});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
`;
mkdirSync(join(dir, 'dist'), { recursive: true });
writeFileSync(join(dir, 'dist', cfg.output), out);

// A stand-in for the host site: a sticky header and deliberately hostile theme styles,
// to prove the hub is unaffected by whatever page it is embedded in.
const preview = `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${cfg.name} brand hub: local preview</title>
<style>
  body{margin:0;font-family:"Comic Sans MS",cursive;color:green;line-height:3;text-align:center}
  .theme-header{position:sticky;top:0;z-index:50;height:70px;background:#222;color:#fff;display:flex;align-items:center;justify-content:center;font:16px system-ui}
  .theme-footer{background:#222;color:#fff;padding:40px;font:14px system-ui}
  /* hostile theme rules: none of these should reach the hub */
  h1,h2,h3{font-size:90px;color:green;text-transform:uppercase}
  button{background:lime;border-radius:40px;padding:30px}
  section{display:none}
  p{margin:60px}
  a{color:orange}
  input,textarea{border:6px solid red}
  canvas{display:none}
  *{letter-spacing:3px}
</style></head>
<body>
<div class="theme-header">Host site header (sticky, 70px)</div>
<div id="${cfg.mountId}" data-top="70"></div>
<script src="./${cfg.output}" defer></script>
<div class="theme-footer">Host site footer</div>
</body></html>
`;
writeFileSync(join(dir, 'dist', 'preview.html'), preview);
console.log(`Built brands/${brand}/dist/${cfg.output} (${(out.length / 1024).toFixed(0)} KB)`);
