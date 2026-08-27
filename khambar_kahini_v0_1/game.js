let selectedPole=null;
let score=0,battery=67,frustration=0,power=false;

const poleLines={
  1:"ভাই, আমি ১৮ বছর ধরে দাঁড়িয়ে আছি… কারেন্টের খবর আমার কাছেও নেই! 😭",
  2:"আমার তার ঠিক আছে। কিন্তু কারেন্ট কোথায়—এই প্রশ্নের উত্তর আমি দিই না! 😂",
  3:"আমাকে দেখে লাভ কী? অফিসে যান, তারপর আবার অপেক্ষা করুন! 😅"
};

function update(){
 document.querySelector("#score").textContent=score;
 document.querySelector("#battery").textContent=Math.max(0,battery);
 document.querySelector("#frustration").textContent=frustration;
 document.querySelector("#power").textContent=power?"ON":"OFF";
}
function say(t){
 const b=document.querySelector("#bubble"); b.textContent=t;b.classList.remove("hidden");
 clearTimeout(window.bt);window.bt=setTimeout(()=>b.classList.add("hidden"),4200);
 document.querySelector("#message").textContent=t;
}
function checkPole(){
 if(!selectedPole){say("আগে একটি খাম্বায় চাপ দাও।");return}
 score+=100; battery-=3; frustration+=5;
 say(poleLines[selectedPole]); update();
}
document.querySelectorAll(".pole").forEach(p=>p.addEventListener("click",()=>{
 selectedPole=Number(p.dataset.pole);
 say("খাম্বা "+selectedPole+" নির্বাচিত। এখন “খাম্বা চেক” চাপো।");
}));

function complain(){
 score+=50; battery-=2; frustration+=8; update();
 document.querySelector("#office").classList.remove("hidden");
 document.querySelector("#villainText").textContent="একটু অপেক্ষা করুন…";
 window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
}
function plan(){
 document.querySelector("#villainText").textContent="উই হ্যাভ এ প্লান…";
 score+=250; frustration+=10; update();
 say("🎙️ Custom voice-এর জায়গা এখানে বসবে: “We have a plan”");
}
function askPlan(){
 document.querySelector("#villainText").textContent="প্ল্যানটা খুব গোপন। আগে আর একটু অপেক্ষা করুন।";
 score+=80;frustration+=6;update();
}
function closeOffice(){
 document.querySelector("#office").classList.add("hidden");
 document.querySelector("#message").textContent="অফিস থেকে বের হলেন। এখন আবার খাম্বা পরীক্ষা করুন।";
}
function waitPower(){
 battery-=1;frustration+=2;
 if(Math.random()<.35){
   power=true; score+=200; say("⚡ কারেন্ট এসেছে! তাড়াতাড়ি কাজ শেষ করো!");
   setTimeout(()=>{power=false;say("💡 কিন্তু আবার চলে গেল!");update()},5000);
 }else say("⏳ এখনো অপেক্ষা চলছে…");
 update();
}
update();
