const els = Object.fromEntries([...document.querySelectorAll('[id]')].map(e => [e.id, e]));
let sourceImage = null;

function clamp(v, a=0, b=1){ return Math.max(a, Math.min(b, v)); }
function hexToRgb(hex){ const n=parseInt(hex.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function mix(a,b,t){ return a*(1-t)+b*t; }
function colorRamp(t){
  const s=hexToRgb(els.shadowColor.value), m=hexToRgb(els.midColor.value), h=hexToRgb(els.highlightColor.value);
  if(t<0.5){ const k=t*2; return [mix(s[0],m[0],k), mix(s[1],m[1],k), mix(s[2],m[2],k)]; }
  const k=(t-0.5)*2; return [mix(m[0],h[0],k), mix(m[1],h[1],k), mix(m[2],h[2],k)];
}
function luminance(data, idx){ return (0.2126*data[idx]+0.7152*data[idx+1]+0.0722*data[idx+2])/255; }
function blurGray(src, w, h, radius){
  if(radius <= 0) return src;
  let tmp = new Float32Array(w*h), out = new Float32Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let sum=0, n=0; for(let dx=-radius;dx<=radius;dx++){ const xx=clamp(x+dx,0,w-1)|0; sum+=src[y*w+xx]; n++; }
    tmp[y*w+x]=sum/n;
  }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let sum=0, n=0; for(let dy=-radius;dy<=radius;dy++){ const yy=clamp(y+dy,0,h-1)|0; sum+=tmp[yy*w+x]; n++; }
    out[y*w+x]=sum/n;
  }
  return out;
}
function render(){
  if(!sourceImage) return;
  const inC=els.inputCanvas, outC=els.outputCanvas;
  const w=sourceImage.naturalWidth, h=sourceImage.naturalHeight;
  inC.width=outC.width=w; inC.height=outC.height=h;
  const ictx=inC.getContext('2d'), octx=outC.getContext('2d');
  ictx.drawImage(sourceImage,0,0);
  const img=ictx.getImageData(0,0,w,h), d=img.data;
  let shade = new Float32Array(w*h);
  const strength=parseFloat(els.strength.value), contrast=parseFloat(els.contrast.value);
  const inv=els.invert.checked ? -1 : 1;

  if(els.sourceType.value === 'normal'){
    const flipY = els.normalFormat.value === 'directx' ? -1 : 1;
    for(let i=0,p=0;i<d.length;i+=4,p++){
      const nx=(d[i]/255)*2-1;
      const ny=((d[i+1]/255)*2-1)*flipY;
      const nz=(d[i+2]/255)*2-1;
      const slope = 1 - clamp(nz*0.5+0.5);
      const side = clamp((nx*0.35 + ny*0.25)*0.5 + 0.5);
      shade[p] = clamp(0.55 + side*0.25 - slope*0.35*strength);
    }
  } else {
    const height = new Float32Array(w*h);
    for(let i=0,p=0;i<d.length;i+=4,p++) height[p]=luminance(d,i);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const xm=Math.max(0,x-1), xp=Math.min(w-1,x+1), ym=Math.max(0,y-1), yp=Math.min(h-1,y+1);
      const dx=(height[y*w+xp]-height[y*w+xm])*inv;
      const dy=(height[yp*w+x]-height[ym*w+x])*inv;
      const relief = height[y*w+x]*inv;
      shade[y*w+x]=clamp(0.55 + relief*0.25 - Math.hypot(dx,dy)*strength*2.0);
    }
  }
  shade = blurGray(shade, w, h, parseInt(els.softness.value,10));
  const out=octx.createImageData(w,h), od=out.data;
  for(let p=0,i=0;p<shade.length;p++,i+=4){
    let t = clamp((shade[p]-0.5)*contrast+0.5);
    const c=colorRamp(t);
    od[i]=c[0]; od[i+1]=c[1]; od[i+2]=c[2]; od[i+3]=255;
  }
  octx.putImageData(out,0,0);
}

['sourceType','normalFormat','strength','contrast','softness','shadowColor','midColor','highlightColor','invert'].forEach(id=>{
  els[id].addEventListener('input',()=>{ els.strengthOut.textContent=parseFloat(els.strength.value).toFixed(2); els.contrastOut.textContent=parseFloat(els.contrast.value).toFixed(2); els.softnessOut.textContent=els.softness.value; render(); });
});
els.file.addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return;
  const url=URL.createObjectURL(f); const img=new Image();
  img.onload=()=>{ sourceImage=img; render(); URL.revokeObjectURL(url); };
  img.src=url;
});
els.download.addEventListener('click',()=>{
  const a=document.createElement('a'); a.download='generated_albedo.png'; a.href=els.outputCanvas.toDataURL('image/png'); a.click();
});

function describeCurrentAssets(){
  if(!sourceImage || !els.outputCanvas.width || !els.outputCanvas.height) return [];
  return [{
    kind:'image',
    title:'Generated pseudo albedo',
    fileName:'generated_albedo.png',
    mimeType:'image/png',
    dataUrl:els.outputCanvas.toDataURL('image/png'),
    metadata:{sourceTool:'albedo-tools',resourceFormat:'pseudo-albedo'}
  }];
}
window.describeCurrentAssets=describeCurrentAssets;
window.__urageToolDescribeCurrentAssets=describeCurrentAssets;
window.__urageToolDescribeCurrentAsset=()=>describeCurrentAssets()[0]||null;