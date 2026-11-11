(() => {
  const preloader = document.querySelector('#preloader');
  if (!preloader) return;
  function finish() {
    preloader.classList.add('is-done');
    document.body.classList.remove('is-preloading');
    setTimeout(() => preloader.remove(), 600);
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
  setTimeout(finish, 1200);
})();

const dialog = document.querySelector('#detail');
const projects = [
 {title:'Network Traffic Analysis',category:'Networking / sample lab',copy:'A sample case-study layout for a security project. Your real project will explain the problem, your approach, the tools you used, and what you learned. This example does not represent completed work.',tags:['The challenge','Your process','Results & learning']},
 {title:'Security Event Investigation',category:'Defense / sample lab',copy:'An illustrative layout for a security investigation write-up. A real entry could document the lab setup, the evidence reviewed, the investigation steps, and lessons learned. The sample event counts are decorative demo data, not personal achievements.',tags:['Lab context','Evidence & analysis','Lessons learned']},
 {title:'Behind the investigation',category:'Research / illustrative concept',copy:'A place for your technical notes, lab write-ups, and research. Each entry can explain a question, document the investigation, and share the key takeaways.',tags:['Research question','Method','Findings']}
];
function showDetail(title,label,copy,tags=[]){
 document.querySelector('#dialog-title').textContent=title;
 document.querySelector('#dialog-label').textContent=label;
 document.querySelector('#dialog-copy').textContent=copy;
 const extra=document.querySelector('#dialog-extra'); extra.replaceChildren();
 if(tags.length){const group=document.createElement('div');group.className='dialog-tags';tags.forEach(text=>{const tag=document.createElement('span');tag.textContent=text;group.append(tag)});extra.append(group)}
 dialog.showModal();
}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-filter]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active))});
 document.querySelectorAll('.project[data-project]').forEach(card=>{card.hidden=button.dataset.filter!=='all'&&button.dataset.filter!==card.dataset.category});
}));
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{const item=projects[Number(button.dataset.project)];showDetail(item.title,item.category,item.copy,item.tags)}));
document.querySelectorAll('.close,.close-bottom').forEach(button=>button.addEventListener('click',()=>dialog.close()));
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close()}});
const menu=document.querySelector('.menu'),nav=document.querySelector('nav');menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');menu.textContent=open?'×':'☰'});
nav.addEventListener('click', event => {
  if (!event.target.closest('a')) return;
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
  menu.textContent = '☰';
});

// Motion is optional, follows OS preferences, and never hides page content.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('.motion-toggle');
let motionEnabled = false;
let preferredMotion = true;
try { preferredMotion = localStorage.getItem('portfolio-motion') !== 'off'; } catch {}
const runningAnimations = new Set();
function animateElement(element, frames, options = {}) {
 if (!motionEnabled || !element.animate) return;
 const animation = element.animate(frames, {duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', ...options});
 runningAnimations.add(animation);
 animation.finished.then(() => runningAnimations.delete(animation), () => runningAnimations.delete(animation));
}
function applyMotion() {
 motionEnabled = preferredMotion && !motionQuery.matches;
 document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
 motionButton.textContent = motionEnabled ? 'Motion: on' : 'Motion: off';
 motionButton.setAttribute('aria-pressed', String(motionEnabled));
 motionButton.disabled = motionQuery.matches;
 motionButton.setAttribute('aria-label', motionQuery.matches ? 'Animations disabled by your reduced-motion preference' : (motionEnabled ? 'Pause animations' : 'Enable animations'));
 motionButton.title = motionQuery.matches ? 'Respects your system reduced-motion preference' : 'Toggle interface animations';
 if (!motionEnabled) runningAnimations.forEach(animation => animation.cancel());
}
motionButton.addEventListener('click', () => {
 preferredMotion = !preferredMotion;
 try { localStorage.setItem('portfolio-motion', preferredMotion ? 'on' : 'off'); } catch {}
 applyMotion();
});
motionQuery.addEventListener('change', applyMotion);
applyMotion();
document.querySelectorAll('.hero-copy > *, .cyber-map').forEach((element, index) => {
 animateElement(element, [{opacity: 0, transform: 'translateY(22px)'}, {opacity: 1, transform: 'translateY(0)'}], {delay: index * 85, duration: 850});
});
if ('IntersectionObserver' in window) {
 const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
   if (!entry.isIntersecting) return;
   animateElement(entry.target, [{opacity: .15, transform: 'translateY(24px)'}, {opacity: 1, transform: 'translateY(0)'}]);
   revealObserver.unobserve(entry.target);
  });
 }, {threshold: .08});
 document.querySelectorAll('.section-top, .section-title, .project, .writing-entry, .about-grid > div, .contact > h2, .contact > p').forEach(element => revealObserver.observe(element));
 const activityObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('motion-visible', entry.isIntersecting));
 }, {rootMargin: '30px'});
 document.querySelectorAll('.cyber-map, .project-art').forEach(element => activityObserver.observe(element));
} else {
 document.querySelectorAll('.cyber-map, .project-art').forEach(element => element.classList.add('motion-visible'));
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
 document.querySelectorAll('.project[data-project]:not([hidden])').forEach((card, index) => animateElement(card, [{opacity: .3, transform: 'translateY(12px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 350, delay: index * 50}));
}));
new MutationObserver(() => {
 if (dialog.open) animateElement(dialog, [{opacity: 0, transform: 'translateY(16px) scale(.98)'}, {opacity: 1, transform: 'translateY(0) scale(1)'}], {duration: 280});
}).observe(dialog, {attributes: true, attributeFilter: ['open']});
document.addEventListener('visibilitychange', () => {
 document.documentElement.classList.toggle('page-hidden', document.hidden);
});

// Keep the native pointer responsive while the decorative ring follows it.
const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
const cursorRing = document.createElement('div');
cursorRing.className = 'cursor-ring';
cursorRing.setAttribute('aria-hidden', 'true');
document.body.append(cursorRing);

let pointerPosition = null;
let ringPosition = null;
let cursorFrame = 0;

function hideCursorRing() {
  cursorRing.classList.remove('is-visible');
  cancelAnimationFrame(cursorFrame);
  cursorFrame = 0;
  pointerPosition = ringPosition = null;
}

function moveCursorRing() {
  cursorFrame = 0;
  if (!motionEnabled || !finePointer.matches || !pointerPosition) {
    hideCursorRing();
    return;
  }
  ringPosition.x += (pointerPosition.x - ringPosition.x) * .22;
  ringPosition.y += (pointerPosition.y - ringPosition.y) * .22;
  cursorRing.style.transform = 'translate3d(' + ringPosition.x + 'px,' + ringPosition.y + 'px,0)';
  if (Math.hypot(pointerPosition.x - ringPosition.x, pointerPosition.y - ringPosition.y) > .2) {
    cursorFrame = requestAnimationFrame(moveCursorRing);
  }
}

window.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !motionEnabled || !finePointer.matches) {
    hideCursorRing();
    return;
  }
  pointerPosition = {x: event.clientX, y: event.clientY};
  if (!ringPosition) ringPosition = {...pointerPosition};
  cursorRing.classList.toggle('is-interactive', Boolean(event.target.closest('a, button, summary')));
  cursorRing.classList.add('is-visible');
  if (!cursorFrame) cursorFrame = requestAnimationFrame(moveCursorRing);
}, {passive: true});
document.documentElement.addEventListener('pointerleave', hideCursorRing);
window.addEventListener('blur', hideCursorRing);
finePointer.addEventListener('change', hideCursorRing);
new MutationObserver(hideCursorRing).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-motion'],
});

// Ambient background texture for the hero: a quiet column drift of hex/ASCII
// glyphs in the site's own palette, not a literal recreation of any film effect.
(() => {
  const canvas = document.querySelector('.code-rain');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const glyphs = '01 0x A3 F2 9D 7C E1 6B #! $& 0101 1010'.split(' ');
  const fontSize = 15;
  let columns = 0;
  let drops = [];
  let running = false;
  let rafId = 0;
  let dpr = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    columns = Math.max(1, Math.floor(rect.width / fontSize));
    drops = Array.from({length: columns}, () => Math.random() * -40);
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = 'rgba(23, 25, 23, 0.16)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.font = fontSize + 'px "IBM Plex Mono", monospace';
    for (let i = 0; i < columns; i++) {
      const glyph = glyphs[(Math.random() * glyphs.length) | 0];
      const lit = Math.random() > 0.94;
      ctx.fillStyle = lit ? '#d5e9b8' : 'rgba(131, 150, 122, 0.45)';
      ctx.fillText(glyph, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > rect.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 0.4;
    }
    if (running) rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    canvas.classList.add('is-active');
    resize();
    rafId = requestAnimationFrame(draw);
  }
  function stop() {
    if (!running) return;
    running = false;
    canvas.classList.remove('is-active');
    cancelAnimationFrame(rafId);
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  let inView = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }, {threshold: .05}).observe(canvas.closest('.hero'));
  }

  function sync() {
    const on = document.documentElement.dataset.motion === 'on';
    if (on && inView && !document.hidden) start(); else stop();
  }

  window.addEventListener('resize', () => { if (running) resize(); });
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.documentElement, {attributes: true, attributeFilter: ['data-motion']});
  sync();
})();

// Rotating glyph sphere behind the hero portrait: an evenly distributed
// "Fibonacci sphere" of points, each labelled with a hex/ASCII glyph,
// projected with simple perspective. Auto-rotates with Motion on,
// drag-to-rotate always available since it's a direct user action.
(() => {
  const canvas = document.querySelector('.glyph-sphere');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const glyphs = '01 0x A3 F2 9D 7C E1 6B #! $&'.split(' ');
  const pointCount = 170;
  const points = [];
  for (let i = 0; i < pointCount; i++) {
    const y = 1 - (i / (pointCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    points.push({
      x: Math.cos(theta) * radiusAtY,
      y,
      z: Math.sin(theta) * radiusAtY,
      glyph: glyphs[(Math.random() * glyphs.length) | 0],
    });
  }
  const tilt = -0.3;
  let rotation = 0;
  let dragRotation = 0;
  let dragging = false;
  let lastX = 0;
  let dpr = 1;
  let rafId = 0;
  let running = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.37;
    ctx.clearRect(0, 0, rect.width, rect.height);
    const angle = rotation + dragRotation;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    const projected = points.map(p => {
      const x1 = p.x * cosA - p.z * sinA;
      const z1 = p.x * sinA + p.z * cosA;
      const y2 = p.y * cosT - z1 * sinT;
      const z2 = p.y * sinT + z1 * cosT;
      const scale = 0.55 + (z2 + 1) * 0.3;
      return {px: cx + x1 * radius * scale, py: cy + y2 * radius * scale, z: z2, glyph: p.glyph, scale};
    });
    projected.sort((a, b) => a.z - b.z);
    for (const p of projected) {
      const alpha = 0.25 + ((p.z + 1) / 2) * 0.6;
      ctx.font = Math.round(9 + p.scale * 5) + 'px "IBM Plex Mono", monospace';
      ctx.fillStyle = p.z > 0.45 ? `rgba(213, 233, 184, ${alpha})` : `rgba(131, 150, 122, ${alpha})`;
      ctx.fillText(p.glyph, p.px, p.py);
    }
    if (running) rafId = requestAnimationFrame(tick);
  }

  let lastTime = 0;
  function tick(time) {
    const delta = lastTime ? time - lastTime : 0;
    lastTime = time;
    if (!dragging) rotation += delta * 0.00018;
    draw();
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    resize();
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  }

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
    if (!running) { resize(); draw(); }
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    dragRotation += (event.clientX - lastX) * 0.012;
    lastX = event.clientX;
    if (!running) draw();
  });
  function endDrag() { dragging = false; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  let inView = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }, {threshold: .05}).observe(canvas.closest('.hero'));
  }

  function sync() {
    const on = document.documentElement.dataset.motion === 'on';
    if (on && inView && !document.hidden) start(); else stop();
  }

  window.addEventListener('resize', () => { resize(); if (!running) draw(); });
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.documentElement, {attributes: true, attributeFilter: ['data-motion']});
  sync();
  if (!running) { resize(); draw(); }
})();
