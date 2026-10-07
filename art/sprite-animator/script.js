const $=id=>document.getElementById(id);
const canvas=$('canvas'), ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

let img=null, playing=true, t0=performance.now();

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
  im.onload=()=>{img=im;URL.revokeObjectURL(u)};
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

function drawFrame(targetCtx,w,h,p,clear=true,ox=0,oy=0){
  if(clear) targetCtx.clearRect(0,0,w,h);
  if(!img){
    targetCtx.fillStyle='#9aa6ba';targetCtx.font='20px system-ui';targetCtx.textAlign='center';
    targetCtx.fillText('Upload a sprite PNG to begin',w/2,h/2);return;
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
    a.download=`${$('mode').value}-spritesheet-${n}f-${grid?'grid':'row'}.png`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });
};
