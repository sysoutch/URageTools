const $=id=>document.getElementById(id);
const canvas=$('canvas'), ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

let img=null, sourcePixels=null, playing=true, t0=performance.now();
const pixelCache=new Map();
const pixelCanvas=document.createElement('canvas');
const pixelCtx=pixelCanvas.getContext('2d');
function resetPixelCache(){pixelCache.clear()}
$('mode').addEventListener('change',resetPixelCache);
$('pixelArt').addEventListener('change',resetPixelCache);

function bindPair(a,b){
  const A=$(a),B=$(b);
  A.oninput=()=>B.value=A.value;
  B.oninput=()=>A.value=B.value;
}
bindPair('frames','framesN'); bindPair('fps','fpsN');
bindPair('motion','motionN'); bindPair('squash','squashN'); bindPair('lean','leanN');

$('file').onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const u=URL.createObjectURL(f), im=new Image();
  im.onload=()=>{
    img=im;
    const source=document.createElement('canvas');
    source.width=im.naturalWidth;source.height=im.naturalHeight;
    const sc=source.getContext('2d',{willReadFrequently:true});
    sc.drawImage(im,0,0);
    try { sourcePixels=sc.getImageData(0,0,source.width,source.height); } catch(e) {sourcePixels=null;}
    resetPixelCache();URL.revokeObjectURL(u);
  };
  im.src=u;
};

$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play'; if(playing)t0=performance.now()};
$('reset').onclick=()=>{t0=performance.now()};
$('downloadHtml').onclick=async()=>{
  let css=null,js=null;
  try{
    css=await (await fetch('style.css')).text();
    js=await (await fetch('script.js')).text();
  }catch(e){}
  if(!css||!js){alert('This tool is split into index.html, style.css and script.js. Open it over http(s) to save a single-file copy.');return}
  const html=document.documentElement.outerHTML
    .replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>')
    .replace('<script src="script.js"><\/script>',()=>'<script>'+js+'<\/script>');
  const blob=new Blob([html],{type:'text/html'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sprite-animator.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

function checker(){
  if(!$('checker').checked){ctx.fillStyle='#11151d';ctx.fillRect(0,0,canvas.width,canvas.height);return}
  const s=24;
  for(let y=0;y<canvas.height;y+=s)for(let x=0;x<canvas.width;x+=s){
    ctx.fillStyle=((x/s+y/s)&1)?'#171a21':'#20242d';ctx.fillRect(x,y,s,s)
  }
}

function paramsAt(p){
  const mode=$('mode').value;
  const motion=+$('motion').value, squash=+$('squash').value/100, lean=+$('lean').value*Math.PI/180;
  if(mode==='idle'){
    const s=Math.sin(p*Math.PI*2), c=Math.cos(p*Math.PI*2);
    return {
      y:-Math.abs(s)*motion*.45,
      sx:1 + c*squash*.25,
      sy:1 - c*squash*.25,
      rot:s*lean*.35,
      shadow:1-Math.abs(s)*.12
    };
  } else {
    const arc=Math.sin(p*Math.PI);
    const landing=Math.max(0,1-Math.abs(p-.5)*10);
    return {
      y:-arc*motion*3,
      sx:1 - arc*squash*.25 + landing*squash*.35,
      sy:1 + arc*squash*.35 - landing*squash*.3,
      rot:(p-.5)*lean*1.3,
      shadow:1-arc*.45
    };
  }
}


// Pixel-art mode rasterizes each output grid cell from an actual source pixel.
// All deformation, rotation, and translation are evaluated by inverse mapping;
// canvas never scales a previously rendered frame by fractional amounts.
function pixelFrame(w,h,p){
  const key=[w,h,p,$('mode').value,$('motion').value,$('squash').value,$('lean').value,$('shadow').checked].join('|');
  if(pixelCache.has(key)) return pixelCache.get(key);
  const out=document.createElement('canvas');out.width=w;out.height=h;
  const c=out.getContext('2d');c.imageSmoothingEnabled=false;
  if(!sourcePixels)return out;
  const sw=sourcePixels.width,sh=sourcePixels.height,src=sourcePixels.data;
  const scale=Math.min(w*.42/sw,h*.55/sh);
  // Big input sprites are downsampled to fit; small sprites preserve each input pixel.
  const sourceStep=Math.max(1,Math.ceil(1/Math.max(scale,0.00001)));
  const unit=Math.max(1,Math.floor(scale*sourceStep));
  const pw=Math.ceil(sw/sourceStep),ph=Math.ceil(sh/sourceStep);
  const q=paramsAt(p);
  const cx=Math.round((w/2)/unit)*unit;
  const ground=Math.round((h*.79)/unit)*unit;
  const oy=Math.round(q.y/unit)*unit;
  if($('shadow').checked){
    c.save();c.globalAlpha=.24;c.fillStyle='#000';c.beginPath();
    c.ellipse(cx,ground+8,pw*unit*.34*q.shadow,Math.max(5,ph*unit*.055*q.shadow),0,0,Math.PI*2);
    c.fill();c.restore();
  }
  const co=Math.cos(q.rot),si=Math.sin(q.rot);
  const halfW=pw/2, halfH=ph;
  const rad=Math.ceil(Math.hypot(pw*unit*Math.max(1,q.sx),ph*unit*Math.max(1,q.sy)) /unit)+2;
  const centerX=cx/unit, baseY=(ground+oy)/unit;
  const minX=Math.max(0,Math.floor(centerX-rad));
  const maxX=Math.min(Math.ceil(w/unit),Math.ceil(centerX+rad));
  const minY=Math.max(0,Math.floor(baseY-rad));
  const maxY=Math.min(Math.ceil(h/unit),Math.ceil(baseY+rad));
  // Compose at one pixel per logical output cell, then enlarge with nearest neighbor.
  const gw=maxX-minX,gh=maxY-minY;
  if(gw<=0||gh<=0)return out;
  const raster=c.createImageData(gw,gh),dst=raster.data;
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
    const dx=(minX+x+.5-centerX),dy=(minY+y+.5-baseY);
    const ix=( co*dx+si*dy)/q.sx+halfW;
    const iy=(-si*dx+co*dy)/q.sy+halfH;
    const sx=Math.floor(ix)*sourceStep,sy=Math.floor(iy)*sourceStep;
    if(sx<0||sy<0||sx>=sw||sy>=sh)continue;
    const a=(sy*sw+sx)*4,b=(y*gw+x)*4;
    dst[b]=src[a];dst[b+1]=src[a+1];dst[b+2]=src[a+2];dst[b+3]=src[a+3];
  }
  pixelCanvas.width=gw;pixelCanvas.height=gh;
  pixelCtx.putImageData(raster,0,0);
  c.drawImage(pixelCanvas,(minX*unit),(minY*unit),gw*unit,gh*unit);
  if(pixelCache.size>90)pixelCache.clear();
  pixelCache.set(key,out);
  return out;
}

function drawFrame(targetCtx,w,h,p,clear=true,ox=0,oy=0){
  if(clear) targetCtx.clearRect(0,0,w,h);
  if(!img){
    targetCtx.fillStyle='#9aa6ba';targetCtx.font='20px system-ui';targetCtx.textAlign='center';
    targetCtx.fillText('Upload a sprite PNG to begin',w/2,h/2);return;
  }

  if($('pixelArt').checked){
    targetCtx.drawImage(pixelFrame(w,h,p),ox,oy);return;
  }
  const q=paramsAt(p);
  const maxW=w*.42,maxH=h*.55;
  const scale=Math.min(maxW/img.width,maxH/img.height);
  const iw=img.width*scale, ih=img.height*scale;
  const cx=ox+w/2, ground=oy+h*.79;

  if($('shadow').checked){
    targetCtx.save();
    targetCtx.globalAlpha=.24;
    targetCtx.fillStyle='#000';
    targetCtx.beginPath();
    targetCtx.ellipse(cx,ground+8,iw*.34*q.shadow,Math.max(5,ih*.055*q.shadow),0,0,Math.PI*2);
    targetCtx.fill();
    targetCtx.restore();
  }

  targetCtx.save();
  targetCtx.translate(cx,ground+q.y);
  targetCtx.rotate(q.rot);
  targetCtx.scale(q.sx,q.sy);
  targetCtx.imageSmoothingEnabled=false;
  targetCtx.drawImage(img,-iw/2,-ih,iw,ih);
  targetCtx.restore();
}

function render(now){
  checker();
  const fps=+$('fps').value, frames=+$('frames').value;
  const elapsed=(now-t0)/1000;
  const frame=playing?Math.floor(elapsed*fps)%frames:0;
  const p=frame/frames;
  drawFrame(ctx,canvas.width,canvas.height,p,false);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

$('export').onclick=()=>{
  if(!img){alert('Upload a sprite first. Humanity must still provide at least one pixel.');return}
  const n=+$('frames').value;
  const cell=256;
  const grid=$('layout').value==='grid';
  const cols=grid?Math.ceil(Math.sqrt(n)):n;
  const rows=Math.ceil(n/cols);
  const out=document.createElement('canvas');
  out.width=cell*cols; out.height=cell*rows;
  const c=out.getContext('2d'); c.imageSmoothingEnabled=false;
  for(let i=0;i<n;i++) drawFrame(c,cell,cell,i/n,false,(i%cols)*cell,Math.floor(i/cols)*cell);
  out.toBlob(blob=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${$('mode').value}${$('pixelArt').checked?'-pixel-art':''}-spritesheet-${n}f-${grid?'grid':'row'}.png`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });
};
