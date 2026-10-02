/* VIVID IELTS — Autumn Study Season */
(function(){
  'use strict';
  if(window.self!==window.top) return;
  var TZ='Asia/Tashkent';
  var RAIN_KEY='ieltsMaxAutumnRain';
  var FOCUS_KEY='ieltsMaxAutumnFocus';
  var LEAF_KEY='vividAutumnLeaves';

  function tashkentParts(){
    var now=new Date();
    try{
      var parts={};
      new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',hourCycle:'h23',month:'2-digit',day:'2-digit'}).formatToParts(now).forEach(function(p){parts[p.type]=p.value});
      return {hour:Number(parts.hour||0),month:Number(parts.month||1),day:Number(parts.day||1)};
    }catch(e){
      var u=new Date(now.getTime()+5*3600*1000);
      return {hour:u.getUTCHours(),month:u.getUTCMonth()+1,day:u.getUTCDate()};
    }
  }

  function applyMood(){
    var t=tashkentParts();
    document.body.classList.add('autumn-theme');
    document.body.classList.add('autumn-morning');
    document.body.classList.remove('autumn-evening');
    document.body.classList.toggle('autumn-october',t.month===10);
    document.documentElement.style.colorScheme=t.hour<5||t.hour>=18?'dark light':'light';
  }

  function buildWeather(){
    if(document.getElementById('autumnWeather')) return;
    var layer=document.createElement('div');
    layer.id='autumnWeather';
    layer.setAttribute('aria-hidden','true');
    var leafIcons=['🍂','🍁','🍂','🍁','🍂','🍁','🍂'];
    var positions=[7,19,34,49,64,79,92];
    leafIcons.forEach(function(icon,i){
      var leaf=document.createElement('span');
      leaf.className='autumn-leaf';
      leaf.textContent=icon;
      leaf.style.left=positions[i]+'%';
      leaf.style.setProperty('--leaf-duration',(14+(i%4)*2.7)+'s');
      leaf.style.setProperty('--leaf-delay',(-i*3.1)+'s');
      leaf.style.setProperty('--leaf-drift',((i%2?1:-1)*(38+i*7))+'px');
      leaf.style.setProperty('--leaf-drift2',((i%3-1)*42)+'px');
      layer.appendChild(leaf);
    });
    for(var i=0;i<46;i++){
      var drop=document.createElement('i');
      drop.className='autumn-rain-drop';
      drop.style.left=((i*37)%101)+'%';
      drop.style.setProperty('--rain-length',(24+(i%5)*7)+'px');
      drop.style.setProperty('--rain-duration',(1.05+(i%7)*.09)+'s');
      drop.style.setProperty('--rain-delay',(-((i*13)%17)/10)+'s');
      layer.appendChild(drop);
    }
    document.body.appendChild(layer);
  }

  function addOctoberBadges(){
    var t=tashkentParts();
    var leavesOn=!document.body.classList.contains('autumn-leaves-off');
    var chosen=['journal','readingbooster','listeningboost','writingboost','daily','grammar'];
    document.querySelectorAll('.nav-item').forEach(function(item){
      item.classList.toggle('autumn-leaf-badge',leavesOn&&t.month===10&&chosen.indexOf(item.dataset.view)>=0);
    });
  }

  function safeGet(key, fallback){
    try{var v=localStorage.getItem(key);return v===null?fallback:v==='1'}catch(e){return fallback}
  }
  function safeSet(key,val){try{localStorage.setItem(key,val?'1':'0')}catch(e){}}

  function setRain(on,button){
    document.body.classList.toggle('autumn-rain-on',!!on);
    if(button){
      button.setAttribute('aria-pressed',on?'true':'false');
      button.innerHTML='🌧 <span class="autumn-control-text">'+(on?'Rain ON':'Rain OFF')+'</span>';
      button.title=on?'Yomg‘ir effektini o‘chirish':'Yomg‘ir effektini yoqish';
    }
    safeSet(RAIN_KEY,!!on);
  }

  function setLeaves(on,button){
    document.body.classList.toggle('autumn-leaves-off',!on);
    if(button){
      button.setAttribute('aria-pressed',on?'true':'false');
      button.innerHTML='🍂 <span class="autumn-control-text">'+(on?'Leaves ON':'Leaves OFF')+'</span>';
      button.title=on?'Barglar effektini o‘chirish':'Barglar effektini yoqish';
    }
    safeSet(LEAF_KEY,!!on);
    addOctoberBadges();
  }

  function setFocus(on,button){
    document.body.classList.toggle('autumn-focus',!!on);
    if(button){
      button.setAttribute('aria-pressed',on?'true':'false');
      button.innerHTML=(on?'↩':'☕')+' <span class="autumn-control-text">'+(on?'Focusdan chiqish':'Focus')+'</span>';
      button.title=on?'Oddiy ko‘rinishga qaytish':'Autumn Focus — faqat vaqt va mashq';
    }
    safeSet(FOCUS_KEY,!!on);
  }

  function buildControls(){
    if(document.getElementById('autumnControls')) return;
    var wrap=document.createElement('div');
    wrap.id='autumnControls';
    wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label','Autumn study controls');
    var focus=document.createElement('button');
    focus.type='button';focus.id='autumnFocusBtn';
    var rain=document.createElement('button');
    rain.type='button';rain.id='autumnRainBtn';
    var leaves=document.createElement('button');
    leaves.type='button';leaves.id='autumnLeavesBtn';
    wrap.appendChild(focus);wrap.appendChild(rain);wrap.appendChild(leaves);
    document.body.appendChild(wrap);
    var focusOn=safeGet(FOCUS_KEY,false);
    var rainOn=safeGet(RAIN_KEY,true);
    var leavesOn=safeGet(LEAF_KEY,true);
    setFocus(focusOn,focus);setRain(rainOn,rain);setLeaves(leavesOn,leaves);
    focus.addEventListener('click',function(){setFocus(!document.body.classList.contains('autumn-focus'),focus)});
    rain.addEventListener('click',function(){setRain(!document.body.classList.contains('autumn-rain-on'),rain)});
    leaves.addEventListener('click',function(){setLeaves(document.body.classList.contains('autumn-leaves-off'),leaves)});
    document.addEventListener('keydown',function(e){
      if(e.altKey&&(e.key==='f'||e.key==='F')){e.preventDefault();focus.click()}
      if(e.altKey&&(e.key==='r'||e.key==='R')){e.preventDefault();rain.click()}
      if(e.altKey&&(e.key==='l'||e.key==='L')){e.preventDefault();leaves.click()}
      if(e.key==='Escape'&&document.body.classList.contains('autumn-focus')) setFocus(false,focus);
    });
  }

  function boot(){
    applyMood();
    buildWeather();
    buildControls();
    addOctoberBadges();
    setInterval(function(){applyMood();addOctoberBadges()},60000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
