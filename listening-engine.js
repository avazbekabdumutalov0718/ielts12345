(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ListeningEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ENGINE_VERSION='4.0';
  const STOP=new Set(('a an the and or but if then than so because as at by for from in into of on onto to up with without is am are was were be been being do does did have has had can could may might must shall should will would this that these those it its they them their we us our you your he him his she her hers i me my mine not no yes very more most less least much many some any all each every other another such only also just about around over under after before during while where when why how what which who whom whose there here out again further once own same too s t d ll m re ve don doesn didn isn aren wasn weren won wouldn shouldn couldn cannot cant'.split(/\s+/)));
  const TOPIC_STOP=new Set('rather finally next however therefore meanwhile moreover overall perhaps basically actually simply just also still even indeed instead first second third fourth one study studies research researchers speaker says said'.split(/\s+/));
  const SYN={
    important:'significant',significant:'important',help:'assist',helps:'assists',helped:'assisted',improve:'enhance',improves:'enhances',improved:'enhanced',change:'alter',changes:'alters',changed:'altered',
    problem:'issue',problems:'issues',idea:'concept',ideas:'concepts',show:'demonstrate',shows:'demonstrates',shown:'demonstrated',use:'utilize',uses:'utilizes',used:'utilized',
    start:'begin',starts:'begins',started:'began',end:'finish',ends:'finishes',need:'require',needs:'requires',needed:'required',make:'create',makes:'creates',made:'created',
    get:'obtain',gets:'obtains',got:'obtained',give:'provide',gives:'provides',gave:'provided',think:'believe',thinks:'believes',thought:'believed',
    big:'large',small:'minor',fast:'rapid',slow:'gradual',hard:'difficult',easy:'straightforward',good:'beneficial',bad:'harmful',better:'improved',different:'distinct',
    people:'individuals',person:'individual',work:'labour',job:'occupation',learn:'acquire',learning:'acquisition',study:'research',research:'study',result:'outcome',results:'outcomes',
    reason:'cause',reasons:'causes',effect:'impact',effects:'impacts',increase:'rise',increases:'rises',decrease:'decline',decreases:'declines',reduce:'decrease',reduces:'decreases',
    build:'develop',builds:'develops',develop:'build',develops:'builds',focus:'concentrate',focused:'concentrated',attention:'focus',memory:'recall',habit:'routine',habits:'routines',
    healthy:'beneficial',health:'wellbeing',stress:'pressure',happy:'content',happiness:'wellbeing',fear:'anxiety',skill:'ability',skills:'abilities',practice:'rehearsal',
    common:'widespread',rare:'uncommon',often:'frequently',usually:'typically',sometimes:'occasionally',quickly:'rapidly',slowly:'gradually',main:'primary',key:'crucial',
    possible:'feasible',likely:'probable',clear:'obvious',simple:'straightforward',complex:'complicated',strong:'powerful',weak:'limited',
    choose:'select',choice:'selection',create:'produce',created:'produced',find:'discover',found:'discovered',explain:'clarify',explains:'clarifies',understand:'comprehend',understanding:'comprehension',
    support:'assist',supports:'assists',allow:'enable',allows:'enables',avoid:'prevent',avoids:'prevents',challenge:'difficulty',challenges:'difficulties',benefit:'advantage',benefits:'advantages',
    risk:'danger',risks:'dangers',goal:'objective',goals:'objectives',method:'approach',methods:'approaches',way:'method',ways:'methods',example:'illustration',examples:'illustrations',
    answer:'response',answers:'responses',talk:'discuss',talks:'discusses',say:'state',says:'states',said:'stated',look:'examine',looks:'examines',keep:'maintain',keeps:'maintains',
    stop:'cease',stops:'ceases',grow:'expand',grows:'expands',young:'youthful',old:'aged',new:'novel',future:'coming years',today:'currently',now:'currently',world:'globe',
    body:'organism',brain:'mind',technology:'tech',business:'enterprise',money:'finance',success:'achievement',successful:'effective',failure:'setback',fail:'fall short',time:'period',
    energy:'vitality',sleep:'rest',exercise:'physical activity',food:'nutrition',social:'societal',society:'community',school:'education',student:'learner',students:'learners',teacher:'educator',
    environment:'surroundings',climate:'weather patterns',science:'research',scientist:'researcher',scientists:'researchers',data:'evidence',information:'details',decide:'determine',decision:'choice',
    control:'manage',manage:'control',plan:'strategy',plans:'strategies',process:'procedure',system:'framework',systems:'frameworks',human:'person',humans:'people',life:'existence',real:'actual',really:'truly'
  };
  const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').trim().replace(/\s+/g,' ');
  function formatTime(sec){sec=Math.max(0,Math.floor(Number(sec)||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`}
  function parseTime(line){let m=String(line||'').match(/^\s*\[?(\d{1,2}):(\d{2}):(\d{2})\]?\s*$/);if(m)return Number(m[1])*3600+Number(m[2])*60+Number(m[3]);m=String(line||'').match(/^\s*\[?(\d{1,3}):(\d{2})\]?\s*$/);if(m)return Number(m[1])*60+Number(m[2]);return null}
  function parseTimestampLine(line){const raw=String(line||'').trim();let m=raw.match(/^\[?(\d{1,2}):(\d{2}):(\d{2})\]?\s*(.*)$/);if(m)return{time:Number(m[1])*3600+Number(m[2])*60+Number(m[3]),text:clean(m[4])};m=raw.match(/^\[?(\d{1,3}):(\d{2})\]?\s*(.*)$/);if(m)return{time:Number(m[1])*60+Number(m[2]),text:clean(m[3])};return null}
  function splitCompleteSentences(text){const t=clean(text);if(!t)return {done:[],rest:''};const done=[];let last=0;const re=/[.!?](?:["”’']|\))?(?=\s|$)/g;let m;while((m=re.exec(t))){const end=m.index+m[0].length;const s=clean(t.slice(last,end));if(s.length>=18)done.push(s);last=end}return {done,rest:clean(t.slice(last))}}
  function looksLikeHeading(text){const t=clean(text);if(!t||/[,.!?;:]$/.test(t))return false;const words=t.split(/\s+/);return words.length<=5&&t.length<=58&&/^[A-Z]/.test(t)}
  const YT_NOISE=[
    /^youtube$/i,/^home$/i,/^shorts$/i,/^subscriptions$/i,/^you$/i,/^history$/i,/^sign in$/i,/^search$/i,/^share$/i,/^save$/i,/^download$/i,/^clip$/i,
    /^show transcript$/i,/^transcript$/i,/^description$/i,/^chapters$/i,/^comments?$/i,/^sort by$/i,/^add a comment/i,/^up next$/i,/^more videos$/i,/^show (more|less)$/i,
    /^subscribe(d)?$/i,/^join$/i,/^like$/i,/^dislike$/i,/^reply$/i,/^replies$/i,/^view all/i,/^read more$/i,/^hide$/i,/^report$/i,/^thanks$/i,
    /^\d+[,.]?\d*\s*(views?|likes?|comments?)$/i,/^premiere(d)? /i,/^streamed live/i,/^copyright/i,/^music$/i,/^applause$/i,/^laughter$/i
  ];
  function isYouTubeNoise(line){const t=clean(line);if(!t)return true;if(YT_NOISE.some(re=>re.test(t)))return true;if(/^https?:\/\//i.test(t))return true;if(/^@\S+$/.test(t))return true;if(/^#\S+/.test(t)&&t.split(/\s+/).length<4)return true;return false}
  function transcriptChunks(input){
    const lines=String(input||'').replace(/\r/g,'\n').split(/\n+/).map(clean).filter(Boolean);
    const timestampCount=lines.reduce((n,l)=>n+(parseTimestampLine(l)?1:0),0);
    const chunks=[];
    if(timestampCount>=5){
      let active=false,pendingTime=0,budget=0;
      for(const line of lines){
        const cue=parseTimestampLine(line);
        if(cue){active=true;pendingTime=cue.time;budget=4;if(cue.text&&!isYouTubeNoise(cue.text))chunks.push({time:pendingTime,text:cue.text});continue}
        if(!active)continue;
        if(/^(comments?|sort by|up next|recommended|more videos|description|chapters)$/i.test(line))break;
        if(budget<=0)continue;
        if(isYouTubeNoise(line))continue;
        // YouTube UI copied with Ctrl+A often injects buttons/numbers between cues. Keep only sentence-like transcript text.
        const wc=line.split(/\s+/).length;
        if(wc>=3&&line.length>=12){chunks.push({time:pendingTime,text:line});budget--}
      }
      if(chunks.length>=5)return chunks;
    }
    let pendingTime=0;
    for(let i=0;i<lines.length;i++){
      const line=lines[i],cue=parseTimestampLine(line);
      if(cue){pendingTime=cue.time;if(cue.text&&!isYouTubeNoise(cue.text))chunks.push({time:pendingTime,text:cue.text});continue}
      if(/^\d+$/.test(line)||/^\[?(music|applause|laughter)\]?$/i.test(line)||isYouTubeNoise(line))continue;
      if(looksLikeHeading(line)&&parseTime(lines[i+1])!==null)continue;
      chunks.push({time:pendingTime,text:line});
    }
    return chunks;
  }
  function parseTranscript(input){
    const chunks=transcriptChunks(input);
    const entries=[];let buffer='',bufferTime=chunks[0]?.time??0;
    for(const ch of chunks){
      if(!buffer)bufferTime=ch.time;
      buffer=clean(buffer+' '+ch.text);
      const parts=splitCompleteSentences(buffer);
      for(const sentence of parts.done)entries.push({text:sentence,time:bufferTime});
      buffer=parts.rest;
      if(buffer&&parts.done.length)bufferTime=ch.time;
    }
    if(buffer.length>=24)entries.push({text:buffer,time:bufferTime});
    return entries.filter(e=>e.text.split(/\s+/).length>=4);
  }
  function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let x=(seed||1)>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
  function shuffled(a,r){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
  function pickSpread(arr,n,seed){if(!arr.length)return[];const out=[],r=rng(seed);for(let i=0;i<n;i++){const base=Math.floor((i+.35)*arr.length/n);const jitter=Math.floor((r()-.5)*Math.max(1,arr.length/n*.6));out.push(arr[Math.max(0,Math.min(arr.length-1,base+jitter))])}return out}
  function wordList(entries){const freq=new Map();for(const e of entries)for(const w of norm(e.text).split(' ')){if(w.length<4||STOP.has(w)||/^\d+$/.test(w))continue;freq.set(w,(freq.get(w)||0)+1)}return [...freq].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).map(x=>x[0])}
  function localWords(text){return norm(text).split(' ').filter(w=>w.length>=4&&!STOP.has(w)&&!/^\d+$/.test(w))}
  function sentenceWord(text,words){const local=localWords(text);return local.find(w=>words.includes(w))||local.sort((a,b)=>b.length-a.length)[0]||''}
  function replaceWord(text,target,replacement){return String(text).replace(new RegExp(`\\b${String(target).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i'),replacement)}
  function maskWord(text,target){return replaceWord(text,target,'_____')}
  function phraseTokens(text){return clean(text).split(/\s+/).map((raw,i)=>({raw,word:norm(raw),i})).filter(x=>x.word)}
  function chooseGapPhrase(text,level='B2',r=Math.random,variant=0){
    const toks=phraseTokens(text);if(toks.length<6)return sentenceWord(text,localWords(text));
    const lens=level==='B2'?[2,2,3]:level==='C1'?[2,3,3]:[3,2,3];
    const len=lens[variant%lens.length],from=Math.max(1,Math.floor(toks.length*.22)),to=Math.min(toks.length-len-1,Math.ceil(toks.length*.86));
    const candidates=[];
    for(let i=from;i<=to;i++){
      const seg=toks.slice(i,i+len);if(seg.length!==len)continue;
      if(STOP.has(seg[0].word)||STOP.has(seg[seg.length-1].word)||seg.some(x=>['and','or','but','so','yet','nor'].includes(x.word)))continue;
      const useful=seg.filter(x=>x.word.length>=4&&!STOP.has(x.word));if(!useful.length)continue;
      const score=useful.reduce((a,x)=>a+x.word.length,0)+i/toks.length*4;
      candidates.push({phrase:seg.map(x=>x.raw.replace(/^[^A-Za-z0-9’'-]+|[^A-Za-z0-9’'-]+$/g,'')).join(' '),score});
    }
    if(!candidates.length){const start=Math.max(0,Math.min(toks.length-2,Math.floor(toks.length*.55)));return toks.slice(start,start+Math.min(2,toks.length-start)).map(x=>x.raw.replace(/^[^A-Za-z0-9’'-]+|[^A-Za-z0-9’'-]+$/g,'')).join(' ')}
    candidates.sort((a,b)=>b.score-a.score);const pool=candidates.slice(0,Math.min(8,candidates.length));return pool[(variant+Math.floor(r()*pool.length))%pool.length].phrase;
  }
  function maskPhrase(text,phrase){const parts=clean(phrase).split(/\s+/).filter(Boolean);if(!parts.length)return text;const escaped=parts.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');return String(text).replace(new RegExp(escaped,'i'),parts.map(()=> '_____').join(' '))}
  function makeGapItem(text,time,id,level='B2',seedValue=1,variant=0){const r=rng(hash(String(seedValue)+':'+id+':'+text));const answer=chooseGapPhrase(text,level,r,variant);return{id,prompt:maskPhrase(text,answer),answer,time:Number(time)||0,level}}
  function synonymize(text,intensity=1){
    let out=clean(text),used=0;
    for(const w of localWords(out)){
      const s=SYN[w];if(!s)continue;out=replaceWord(out,w,s);used++;if(used>=intensity)break;
    }
    return out;
  }
  function topicOf(text){const ws=localWords(text).filter(w=>!TOPIC_STOP.has(w)&&!w.endsWith("'s"));if(!ws.length)return 'this point';const first=ws[0].replace(/'/g,'');const second=ws[1]&&!TOPIC_STOP.has(ws[1])?ws[1].replace(/'/g,''):'';return second?`${first} ${second}`:first}
  function comprehensionPrompt(entry,level){const t=topicOf(entry.text),x=norm(entry.text);if(level==='C2')return `Which interpretation most accurately captures the speaker’s argument in this part of the audio?`;if(level==='C1')return `Which option best summarises the speaker’s point in this part of the audio?`;if(/study|studies|research|experiment|observed|tested/.test(x))return 'What does the speaker report from the study or evidence mentioned here?';if(/helps|prevents|increases|reduces|improves|allows|enables/.test(x))return 'What effect does the speaker describe in this part of the audio?';if(/rather|while|however|but/.test(x))return 'Which contrast does the speaker make here?';if(/\bis\b|\bare\b/.test(x))return `What does the speaker explain about “${t}”?`;return 'Which statement best reflects the speaker’s point in this part of the audio?'}
  function correctComprehension(entry,level){if(level==='B2')return clean(entry.text);const base=synonymize(entry.text,level==='C2'?2:1);if(level==='C2')return `The speaker’s argument is that ${base.charAt(0).toLowerCase()+base.slice(1)}`;return `The speaker’s point is that ${base.charAt(0).toLowerCase()+base.slice(1)}`}
  function distractorsFor(entry,level,r){
    const t=topicOf(entry.text),q=`“${t}”`,templates=level==='C2'?[`The speaker treats ${q} as incidental rather than part of the main explanation.`,`The speaker reverses the relationship and presents ${q} mainly as a consequence, not a contributing mechanism.`,`The speaker says the evidence concerning ${q} is too contradictory to support any conclusion.`,`The speaker restricts ${q} to exceptional cases and rejects a broader connection.`]:level==='C1'?[`The speaker presents ${q} as a minor detail with little practical effect.`,`The speaker describes ${q} as producing the opposite result to the one discussed.`,`The speaker treats ${q} as unrelated to the central explanation.`,`The speaker suggests ${q} matters only when other factors are absent.`]:[`The speaker says ${q} has no meaningful connection to the process.`,`The speaker says ${q} produces the opposite effect.`,`The speaker presents ${q} as unimportant to the explanation.`,`The speaker says ${q} applies only in rare situations.`];return shuffled(templates,r).slice(0,3)
  }
  function optionsFor(answer,pool,r){const out=[];for(const w of shuffled(pool,r)){if(w!==answer&&!out.includes(w)){out.push(w);if(out.length===3)break}}while(out.length<3)out.push(['context','evidence','process','result'][out.length]);return shuffled([answer,...out],r)}
  function falseStatement(text){
    let out=clean(text);const pairs=[[/\bcan\b/i,'cannot'],[/\bwill\b/i,'will not'],[/\bis\b/i,'is not'],[/\bare\b/i,'are not'],[/\bdoes\b/i,'does not'],[/\bhelps?\b/i,'prevents'],[/\bincreases?\b/i,'reduces'],[/\bmore\b/i,'less'],[/\bfaster\b/i,'slower'],[/\beffective\b/i,'ineffective']];for(const [re,rep] of pairs){if(re.test(out))return out.replace(re,rep)}return `The speaker rejects the claim that ${out.charAt(0).toLowerCase()+out.slice(1)}`
  }
  function nextTime(entries,e){const i=entries.indexOf(e);for(let j=i+1;j<entries.length;j++){if(Number.isFinite(entries[j].time)&&entries[j].time>e.time)return entries[j].time}return Number(e.time||0)+12}
  function levelForDay(day){day=Number(day)||1;return day<=10?'B2':day<=20?'C1':'C2'}
  function generate(transcript,counts,seedText,level='B2'){
    const entries=parseTranscript(transcript);if(entries.length<8)throw Error('Transcript juda qisqa. Kamida 8 ta to‘liq gap kiriting.');
    level=['B2','C1','C2'].includes(level)?level:'B2';
    const words=wordList(entries);if(words.length<12)throw Error('Transcriptda mashq yaratish uchun yetarli inglizcha so‘z topilmadi.');
    const seed=hash(seedText||transcript.slice(0,200)),r=rng(seed);
    const minLen=level==='C2'?60:level==='C1'?45:28,maxLen=level==='C2'?300:level==='C1'?260:220;
    let source=entries.filter(e=>e.text.length>=minLen&&e.text.length<=maxLen&&localWords(e.text).length>=5&&!/[?]$/.test(e.text));
    if(source.length<8)source=entries.filter(e=>e.text.length>=24&&!/[?]$/.test(e.text));
    const mcq=pickSpread(source,counts.mcq,seed+23).map((e,i)=>{const answer=correctComprehension(e,level);return{id:`m${i+1}`,prompt:comprehensionPrompt(e,level),answer,options:shuffled([answer,...distractorsFor(e,level,r)],r),time:e.time,level}});
    // Gap-fill avoids the opening of the audio and removes a 2–3 word phrase from the middle of each sentence.
    const maxTime=Math.max(...entries.map(e=>Number(e.time)||0),0);let gapPool=source;
    if(maxTime>60){const later=source.filter(e=>(Number(e.time)||0)>=maxTime*.16&&(Number(e.time)||0)<=maxTime*.96);if(later.length>=Math.min(8,Math.ceil(counts.gap/3)))gapPool=later}
    else if(source.length>10)gapPool=source.slice(Math.max(1,Math.floor(source.length*.14)));
    const gaps=pickSpread(gapPool,counts.gap,seed+11).map((e,i)=>makeGapItem(e.text,e.time,`g${i+1}`,level,seed+11,i));
    const tfng=[];const tfSource=pickSpread(source,counts.tfng,seed+31);
    for(let i=0;i<counts.tfng;i++){
      const e=tfSource[i%tfSource.length],mode=i%3;
      if(mode===0)tfng.push({id:`t${i+1}`,statement:synonymize(e.text,level==='B2'?1:2),answer:'TRUE',time:e.time,level});
      else if(mode===1)tfng.push({id:`t${i+1}`,statement:falseStatement(e.text),answer:'FALSE',time:e.time,level});
      else{const topic=topicOf(e.text);tfng.push({id:`t${i+1}`,statement:level==='C2'?`The speaker cites a named longitudinal study as definitive proof about ${topic}.`:`The speaker gives an exact percentage to quantify ${topic}.`,answer:'NOT GIVEN',time:e.time,level})}
    }
    let synPairs=[];for(const [w,s] of Object.entries(SYN)){if(words.includes(w)&&!synPairs.some(x=>x[0]===w))synPairs.push([w,s])}
    while(synPairs.length<counts.paraphrase){const w=words[synPairs.length%words.length];synPairs.push([w,`closest meaning of “${w}” in context`])}
    const para=shuffled(synPairs,r).slice(0,counts.paraphrase).map(([w,s],i)=>({id:`p${i+1}`,prompt:level==='C2'?`Choose the most context-appropriate paraphrase of “${w}”.`:`Audio contextida “${w}” ga eng yaqin paraphraseni tanlang.`,answer:s,options:optionsFor(s,[...Object.values(SYN),...words],r),level}));
    const dictSource=pickSpread(source,counts.dictation,seed+47);
    const dictation=dictSource.map((e,i)=>({id:`d${i+1}`,answer:e.text,time:e.time,endTime:Math.max(Number(e.time||0)+5,Math.min(nextTime(entries,e),Number(e.time||0)+18)),prompt:`${formatTime(e.time)} dan boshlab eshiting va gapni aynan yozing.`,level}));
    return {engineVersion:ENGINE_VERSION,createdAt:new Date().toISOString(),sourceSentenceCount:entries.length,level,mcq,gap:gaps,tfng,paraphrase:para,dictation};
  }
  function upgradeContent(content,counts,seedText,level='B2'){
    const c=JSON.parse(JSON.stringify(content||{}));level=['B2','C1','C2'].includes(level)?level:'B2';
    delete c.notes;c.engineVersion=ENGINE_VERSION;c.level=level;
    const target=Math.max(0,Number(counts?.gap)||0),sources=[];
    for(const x of (Array.isArray(c.dictation)?c.dictation:[]))if(x?.answer)sources.push({text:x.answer,time:x.time||0});
    for(const x of (Array.isArray(c.mcq)?c.mcq:[]))if(x?.answer&&String(x.answer).split(/\s+/).length>=5)sources.push({text:x.answer,time:x.time||0});
    const pool=sources.length>5?sources.slice(Math.floor(sources.length*.15)):sources;c.gap=[];
    let i=0;while(i<target&&pool.length){const e=pool[i%pool.length];c.gap.push(makeGapItem(e.text,e.time,`g${i+1}`,level,hash(seedText||'upgrade'),i));i++}
    return c;
  }
  function youtubeId(url){const raw=String(url||'').trim();if(!raw)return'';let id='';let m=raw.match(/[?&]v=([A-Za-z0-9_-]{6,})/);if(m)id=m[1];if(!id){m=raw.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);if(m)id=m[1]}if(!id){m=raw.match(/youtube(?:-nocookie)?\.com\/(?:shorts|embed)\/([A-Za-z0-9_-]{6,})/);if(m)id=m[1]}return id}
  function videoAt(url,seconds){const raw=String(url||'').trim();if(!raw)return'';const id=youtubeId(raw);if(!id)return raw;return `https://www.youtube.com/watch?v=${id}${Number.isFinite(Number(seconds))?`&t=${Math.max(0,Math.floor(Number(seconds)))}s`:''}`}
  function embedUrl(url,seconds=null){const id=youtubeId(url);if(!id)return'';const start=seconds!==null&&seconds!==''&&Number.isFinite(Number(seconds))?`&start=${Math.max(0,Math.floor(Number(seconds)))}`:'';return `https://www.youtube-nocookie.com/embed/${id}?rel=0${start}`}
  function playerEmbedUrl(url,origin=''){const id=youtubeId(url);if(!id)return'';const o=origin?`&origin=${encodeURIComponent(origin)}`:'';return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&controls=0&playsinline=1&rel=0&disablekb=1${o}`}
  function scoreText(answer,expected){return norm(answer)===norm(expected)}
  return {ENGINE_VERSION,parseTranscript,generate,upgradeContent,makeGapItem,formatTime,youtubeId,videoAt,embedUrl,playerEmbedUrl,scoreText,norm,levelForDay};
});
