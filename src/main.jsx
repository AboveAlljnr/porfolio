import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './portrait.css';
import { projects, expertise } from './content.jsx';

const TAU = Math.PI * 2;
const PORTRAIT_ZOOM = 0.70;
export const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b-a), Math.cos(b-a)) * t;

function MagneticCursor() {
  const dot = useRef(null), aura = useRef(null);
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf, active = false, target = null, hoverScale = 1;
    const pointer = {x:0,y:0}, ring = {x:0,y:0}, spot = {x:0,y:0};
    const move = e => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (!active) { ring.x = spot.x = pointer.x; ring.y = spot.y = pointer.y; }
      active = true;
      target = e.target.closest('a, button');
      document.documentElement.classList.add('custom-cursor');
    };
    const leave = () => { active = false; document.documentElement.classList.remove('custom-cursor'); };
    const render = () => {
      let x = pointer.x, y = pointer.y;
      if (target) {
        const box = target.getBoundingClientRect();
        x += (box.left + box.width/2-x)*.22;
        y += (box.top + box.height/2-y)*.22;
      }
      spot.x += (x-spot.x)*.65; spot.y += (y-spot.y)*.65;
      ring.x += (x-ring.x)*.16; ring.y += (y-ring.y)*.16;
      hoverScale += ((target ? 1.8 : 1)-hoverScale)*.18;
      dot.current.style.transform = `translate(${spot.x}px, ${spot.y}px) translate(-50%, -50%) scale(${1+(hoverScale-1)*.625})`;
      aura.current.style.transform = `translate(${ring.x}px, ${ring.y}px) translate(-50%, -50%) scale(${hoverScale})`;
      dot.current.style.opacity = aura.current.style.opacity = active ? '1' : '0';
      raf = requestAnimationFrame(render);
    };
    window.addEventListener('pointermove', move, {passive:true});
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave); raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave',leave); window.removeEventListener('blur',leave); document.documentElement.classList.remove('custom-cursor'); };
  }, []);
  return <div className="cursor" aria-hidden="true"><div ref={dot} className="cursor-dot"/><div ref={aura} className="cursor-aura"/></div>;
}

function Portrait() {
  const canvas = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = canvas.current, ctx = el.getContext('2d', { alpha: false });
    if (!ctx) return;
    let disposed = false, raf = 0, rect, scene, center, last = null, angle = 0, lastTime = 0;
    let activeLoads = 0, dragId = null, welcomeTimer = 0;
    let welcomeCancelled = false;
    const hero = el.closest('.hero');
    const frames = new Map(), pending = new Set(), queue = [];
    const point = { x: 0, y: 0, active: false };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const connection = navigator.connection;
    const canAnimate = () => !reduced.matches && !connection?.saveData;
    el.parentElement.dataset.motion=canAnimate() ? 'on' : 'off';
    const load = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => { try { await img.decode(); resolve(img); } catch (error) { reject(error); } };
      img.onerror = reject;
      img.src = src;
    });
    const draw = img => {
      if (!img || !scene) return;
      ctx.fillStyle = '#e00907'; ctx.fillRect(0, 0, el.width, el.height);
      const scale = Math.max(el.width / img.width, el.height / img.height) * PORTRAIT_ZOOM;
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (el.width-w)/2, el.height-h, w, h);
    };
    const measure = () => { rect = el.getBoundingClientRect(); };
    const resize = () => {
      measure();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = Math.max(1, Math.round(rect.width*dpr));
      el.height = Math.max(1, Math.round(rect.height*dpr));
      const scale = Math.max(rect.width/1280, rect.height/720)*PORTRAIT_ZOOM;
      scene = { width:1280*scale, height:720*scale };
      scene.x = (rect.width-scene.width)/2; scene.y = rect.height-scene.height;
      draw(last === null ? center : frames.get(last) || center);
    };
    const pump = () => {
      if (disposed || !canAnimate()) { queue.length = 0; pending.clear(); return; }
      while (activeLoads < 3 && queue.length) {
        const index = queue.shift(); activeLoads++;
        load(`/frames/${String(index).padStart(2,'0')}.webp?v=3`).then(img => {
          if (!disposed) { frames.set(index,img); setReady(true); }
        }).catch(() => { /* Keep the previous intact pose when a frame fails. */ })
          .finally(() => { activeLoads--; pending.delete(index); pump(); });
      }
    };
    const requestFrame = index => {
      if (frames.has(index) || pending.has(index)) return;
      // Only fetch the current pose and its neighbours; fast pointer movement
      // replaces stale queued work instead of downloading every frame up front.
      if (queue.length >= 6) pending.delete(queue.pop());
      pending.add(index); queue.unshift(index); pump();
    };
    const render = time => {
      raf = 0;
      if (disposed || !center) return;
      const dx = point.x-(rect.left+scene.x+scene.width*.5);
      const dy = point.y-(rect.top+scene.y+scene.height*.43);
      const active = point.active && canAnimate() && Math.hypot(dx,dy)>Math.min(innerWidth,innerHeight)*.12;
      if (active) {
        const target = (Math.atan2(dy,dx)+TAU)%TAU;
        const delta = lastTime ? Math.min(time-lastTime,50) : 1000/60;
        angle = lerpAngle(angle,target,1-Math.pow(1-.26,delta/(1000/60)));
        const index = ((Math.round(angle/TAU*64)%64)+64)%64;
        requestFrame(index);
        requestFrame((index+1)%64); requestFrame((index+63)%64);
        if (frames.has(index) && last !== index) { draw(frames.get(index)); last=index; el.dataset.frame=String(index); }
        lastTime=time; raf=requestAnimationFrame(render);
      } else { draw(center); last=null; lastTime=0; el.dataset.frame='center'; }
    };
    const wake = () => { if (!raf && center && !disposed) raf=requestAnimationFrame(render); };
    const cancelWelcome = () => { welcomeCancelled=true; clearTimeout(welcomeTimer); };
    const leave = () => { el.parentElement.dataset.motion=canAnimate() ? 'on' : 'off'; cancelWelcome(); dragId=null; point.active=false; wake(); };
    const move = e => {
      if (!canAnimate() || (e.pointerType !== 'mouse' && e.pointerId !== dragId)) return;
      cancelWelcome(); point.x=e.clientX; point.y=e.clientY; point.active=true; wake();
    };
    const down = e => {
      if (e.pointerType === 'mouse' || !e.isPrimary || !canAnimate() || e.target.closest('a,button')) return;
      cancelWelcome(); dragId=e.pointerId;
      point.x=e.clientX; point.y=e.clientY; point.active=true; wake();
    };
    const up = e => { if (e.pointerId === dragId) leave(); };
    const visibility = () => { if (document.hidden) leave(); };
    const scroll = () => { measure(); if (!fine.matches) leave(); };
    const welcome = async () => {
      if (fine.matches || !canAnimate() || welcomeCancelled || rect.bottom<=0 || rect.top>=innerHeight) return;
      try {
        const poses = await Promise.all([0,1,2].map(i=>load(`/frames/${String(i).padStart(2,'0')}.webp?v=3`)));
        if (disposed || welcomeCancelled || !canAnimate() || document.hidden) return;
        poses.forEach((img,i)=>frames.set(i,img)); setReady(true);
        const sequence=[0,1,2,1,0]; let step=0;
        const glance = () => {
          if (disposed || welcomeCancelled || !canAnimate()) return;
          if (step===sequence.length) { draw(center); last=null; el.dataset.frame='center'; return; }
          last=sequence[step++]; draw(frames.get(last)); el.dataset.frame=String(last);
          welcomeTimer=setTimeout(glance,140);
        };
        glance();
      } catch { /* A failed welcome pose leaves the static portrait intact. */ }
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(el);
    load('/frames/center.webp?v=3').then(img => { if (!disposed) { center=img; draw(center); el.style.opacity='1'; el.dataset.frame='center'; welcomeTimer=setTimeout(welcome,650); } }).catch(() => { /* The HTML image remains visible if canvas loading fails. */ });
    hero.addEventListener('pointermove',move,{passive:true});
    hero.addEventListener('pointerdown',down,{passive:true});
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
    el.closest('.hero').addEventListener('pointerleave',leave);
    window.addEventListener('blur',leave);
    window.addEventListener('scroll',scroll,{passive:true});
    document.addEventListener('visibilitychange',visibility);
    reduced.addEventListener('change',leave); fine.addEventListener('change',leave);
    return () => { disposed=true; clearTimeout(welcomeTimer); cancelAnimationFrame(raf); observer.disconnect(); queue.length=0; el.closest('.hero')?.removeEventListener('pointermove',move); el.closest('.hero')?.removeEventListener('pointerleave',leave); window.removeEventListener('blur',leave); window.removeEventListener('scroll',scroll); hero.removeEventListener('pointerdown',down); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up); document.removeEventListener('visibilitychange',visibility); reduced.removeEventListener('change',leave); fine.removeEventListener('change',leave); };
  }, []);
  return <div className="portrait"><img className="portrait-fallback" src="/frames/center.webp?v=3" alt="" fetchPriority="high" width="1280" height="720"/><canvas ref={canvas} role="img" aria-label="Portrait of Courage Agbavor"/><span className="portrait-note"><span className={ready ? 'status ready' : 'status'}/><span className="portrait-desktop-note">{ready ? 'A little curious. Just like you.' : 'A builder. A curious mind.'}</span><span className="portrait-touch-note">Drag to look around ↔</span></span></div>;
}


function App() {
  const [copyStatus, setCopyStatus] = useState('');
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const email = 'elikplimagbavor@gmail.com';
  async function copyEmail() {
    try { await navigator.clipboard.writeText(email); setCopyStatus('Email copied.'); }
    catch { setCopyStatus('Please select and copy the email address above.'); }
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus(''), 4000);
  }
  return <><a className="skip-link" href="#main">Skip to content</a><MagneticCursor/><header className="floating-header"><nav aria-label="Main navigation"><a href="#work">WORK</a><a href="#about">ABOUT</a><a href="#contact">CONTACT <span>↗</span></a></nav></header>
    <main id="main"><section id="top" className="hero" aria-labelledby="hero-title"><Portrait/><div className="hero-shade" aria-hidden="true"/><a className="monogram" href="#top" aria-label="Above All home">A<span>A</span></a><span className="availability"><i/> ACCRA, GHANA · AVAILABLE WORLDWIDE</span>
    <div className="hero-copy"><p className="intro">Hi, I’m</p><h1 id="hero-title">Courage<span>.</span></h1><p className="hero-identity">COURAGE AGBAVOR / ABOVE ALL</p><p className="bio">A Full-Stack Developer & Operations Specialist.<br className="desktop-break"/> I build thoughtful web experiences and make<br className="desktop-break"/> complex systems feel simple.</p><div className="hero-actions"><a className="pill solid" href="#work">Selected work <span aria-hidden="true">↘</span></a><a className="pill glass" href="#contact">Let’s Talk <span aria-hidden="true">↗</span></a></div></div><a className="scroll-cue" href="#work"><span>SCROLL TO EXPLORE</span><span aria-hidden="true">↓</span></a><span className="hero-edition">PORTFOLIO / 2026</span></section>
    <section id="work" className="content-section"><span className="section-label">01 / SELECTED WORK</span><div className="section-heading"><h2>Ideas, out in the world.</h2><p>A selection of websites and digital experiences I’ve brought to life.</p></div><div className="project-grid">{projects.map((project, index) => <article className="project" key={project.url}><a className="project-image" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} (opens in a new tab)`}><img src={`/projects/${project.image}`} alt={`Screenshot of ${project.title}`} loading="lazy" decoding="async"/><span className="project-visit">View live site ↗</span></a><div className="project-meta"><span>0{index + 1} / {project.category}</span><span>2025</span></div><h3><a href={project.url} target="_blank" rel="noopener noreferrer">{project.title} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></h3><p>{project.description}</p><ul className="project-tags" aria-label="Technologies">{project.stack.map(tool => <li key={tool}>{tool}</li>)}</ul></article>)}</div></section>
    <section id="about" className="content-section about"><span className="section-label">02 / ABOUT</span><div className="about-grid"><div><h2>A builder’s mindset.<br/>An eye for the whole system.</h2><p>I’m Courage Agbavor, also known as Above All, a developer and operations thinker based in Accra, Ghana. I connect thoughtful interfaces with the systems and processes that make them work.</p><p>My work spans web development, business operations, and practical automation—from a storefront’s first impression to the information moving behind the scenes.</p><a className="text-link" href="https://github.com/AboveAlljnr" target="_blank" rel="noopener noreferrer">Explore my GitHub <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></div><div className="background"><h3>Experience & education</h3><article><span className="section-label">DEVELOPMENT</span><h4>Freelance / Independent Projects</h4><p>Full-stack web applications, e-commerce, dashboards, and internal tools.</p></article><article><span className="section-label">OPERATIONS</span><h4>Systems & process improvement</h4><p>Business workflows, ERP integrations, automation, and reporting.</p></article><article><span className="section-label">EDUCATION</span><h4>IPMC College of Technology</h4><p>NCC Education Level 5 Diploma in Computing with Business Management.</p></article></div></div></section>
    <section id="expertise" className="content-section"><span className="section-label">03 / EXPERTISE</span><h2>Built with purpose.</h2><div className="expertise-grid">{expertise.map((item, index) => <article key={item.title}><span className="section-label">0{index + 1}</span><h3>{item.title}</h3><p>{item.description}</p><span className="expertise-tools">{item.tools}</span></article>)}</div></section>
    <section id="contact" className="content-section contact"><span className="section-label">04 / CONTACT</span><h2>Have an idea?<br/><em>Let’s make it happen.</em></h2><p>For a new website, a better system, or your next collaboration—get in touch.</p><div className="contact-actions"><a className="contact-email" href={`mailto:${email}`}>{email} <span aria-hidden="true">↗</span></a><button className="pill glass" type="button" onClick={copyEmail}>Copy email</button></div><p className="copy-status" role="status">{copyStatus}</p><div className="social-links"><a href="https://github.com/AboveAlljnr" target="_blank" rel="noopener noreferrer">GitHub ↗<span className="sr-only"> (opens in a new tab)</span></a><a href="https://linkedin.com/in/courage-agbavor-5a1552349" target="_blank" rel="noopener noreferrer">LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span></a></div><footer>© {new Date().getFullYear()} COURAGE AGBAVOR<span>ABOVE ALL / ACCRA, GHANA</span><a href="#top">BACK TO TOP ↑</a></footer></section></main></>;
}
createRoot(document.getElementById('root')).render(<App/>);

