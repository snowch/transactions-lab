// Build-time SVG illustrations. These teach a mechanism; they never read a run.
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function wrap(value,width){
  const lines=[];
  for(const paragraph of String(value).split('\n')){
    let line='';
    for(const word of paragraph.split(' ')){if(line&&`${line} ${word}`.length>width){lines.push(line);line=word;}else line=line?`${line} ${word}`:word;}
    lines.push(line);
  }
  return lines;
}
function words(x,y,value,width=40,kind='body'){
  return `<text x="${x}" y="${y}" class="${kind}">${wrap(value,width).map((line,i)=>`<tspan x="${x}" dy="${i?18:0}">${esc(line)}</tspan>`).join('')}</text>`;
}
function item(item){
  const [type,...v]=item;
  if(type==='box'){
    const [x,y,w,h,title,detail='',tone='']=v;
    return `<g class="box ${tone}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>${words(x+12,y+23,title,Math.floor((w-24)/8),'label')}${detail?words(x+12,y+46,detail,Math.floor((w-24)/7)):''}</g>`;
  }
  if(type==='text'){const[x,y,value,width=40,kind='body']=v;return words(x,y,value,width,kind);}
  if(type==='arrow'){const[path,label='',x=0,y=0,tone='']=v;return `<path d="${path}" class="arrow ${tone}" marker-end="url(#tip${tone==='danger'?'-danger':''})"/>${label?`<g class="edge-label">${words(x,y,label,38,'small')}</g>`:''}`;}
  if(type==='line'){const[x1,y1,x2,y2,tone='']=v;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="rule ${tone}"/>`;}
  if(type==='band'){const[x,y,w,h,label]=v;return `<rect class="boundary" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>${words(x+12,y+20,label,Math.floor((w-24)/7),'small')}`;}
  throw new Error(`Unknown concept drawing item: ${type}`);
}
export function drawConcept(id,concept,mobile=false){
  const gap=24,pad=12,panelWidth=320,panelHeight=concept.height||340;
  const columns=mobile?1:Math.min(2,concept.scenes.length),rows=Math.ceil(concept.scenes.length/columns);
  const width=pad*2+columns*panelWidth+(columns-1)*gap,height=pad*2+rows*panelHeight+(rows-1)*gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(concept.title)}</title><desc id="desc">${esc(concept.alt)}</desc>
<style>
svg{background:#fcfcfa;color:#162b36;font:14px system-ui,-apple-system,sans-serif}text{fill:#162b36}.heading{font-size:16px;font-weight:650}.label{font-size:15px;font-weight:650}.small{font-size:12px;fill:#576b76}.body{font-size:14px}.box rect{fill:#fff;stroke:#adbfbd;stroke-width:1.3}.box.safe rect{fill:#eaf4f1;stroke:#006e67;stroke-width:1.6}.box.danger rect{fill:#fff1ec;stroke:#96392f;stroke-width:1.6}.box.muted rect{stroke-dasharray:5 3;fill:#f5f6f2}.arrow{fill:none;stroke:#006e67;stroke-width:1.8}.arrow.danger{stroke:#96392f}.arrow.dashed{stroke-dasharray:5 3}.rule{stroke:#adbfbd;stroke-width:1.3}.rule.dashed{stroke-dasharray:5 4}.boundary{fill:#eaf4f1;fill-opacity:.45;stroke:#006e67;stroke-width:1.3;stroke-dasharray:6 4}.edge-label text{paint-order:stroke;stroke:#fcfcfa;stroke-width:5px;stroke-linejoin:round}.edge-label tspan{paint-order:stroke}.panel-rule{stroke:#dce4e5}
${mobile?'.body{font-size:15px}.small{font-size:13px}':''}</style><defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#006e67"/></marker><marker id="tip-danger" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#96392f"/></marker></defs>
${concept.scenes.map((scene,i)=>`<g transform="translate(${pad+(i%columns)*(panelWidth+gap)} ${pad+Math.floor(i/columns)*(panelHeight+gap)})">${words(4,20,`${i+1}. ${scene.title}`,38,'heading')}<line class="panel-rule" x1="4" x2="316" y1="33" y2="33"/><g transform="translate(0 46)">${scene.items.map(item).join('')}</g></g>`).join('')}
</svg>`;
}
export function conceptFigure(id,concept){
  return `<figure class="concept-figure" aria-labelledby="concept-${id}"><div class="concept-label">Concept diagram · before the experiment</div><h2 id="concept-${id}">${esc(concept.title)}</h2><picture><source media="(max-width: 600px)" srcset="./concepts/${id}-mobile.svg"><img src="./concepts/${id}.svg" alt="${esc(concept.alt)}" decoding="async"></picture><figcaption><strong>Read the diagram:</strong> ${esc(concept.caption)} <a href="./concepts/${id}.svg">Open full diagram</a></figcaption></figure>`;
}
