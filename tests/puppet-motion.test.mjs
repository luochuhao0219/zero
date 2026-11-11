import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultDraft,sanitizeDraft} from '../src/explore-data.js';
import {JOINT_LIMITS,getJoints,withJoints,jointPoint,jointTransforms,solveLimb,solveTwoLink,canonicalToPaper,paperToCanonical,crouchAt,blendActor} from '../src/puppet-motion.js';
import {sampleAction,walkActor,solveHand} from '../src/motion-clips.js';
import {compileMotionTimeline,sampleMotionTimeline,materializeActionKeys} from '../src/motion-timeline.js';
import {starterDraft,compilePlay,getPlayDuration,samplePlay,PLAY_DURATION} from '../src/studio-story.js';
const actor=()=>defaultDraft().actors[0];
const near=(a,b,tolerance=.02)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('neck and elbow rotate independently while the waist carries the upper body',()=>{
 const a=actor(),base=jointTransforms(a),neck=jointTransforms(withJoints(a,{neck:30})),arm=jointTransforms(withJoints(a,{elbowFront:100})),bow=jointTransforms(withJoints(a,{waist:30}));
 assert.deepEqual(neck.torso,base.torso);assert.deepEqual(neck.upperFront,base.upperFront);assert.notEqual(neck.head.angle,base.head.angle);
 assert.deepEqual(arm.upperFront,base.upperFront);assert.notEqual(arm.handFront.x,base.handFront.x);assert.deepEqual(bow.pelvis,base.pelvis);assert.notEqual(bow.head.x,base.head.x);
});
test('two-link IK reaches supported targets with fixed bone lengths and stable bends',()=>{
 for(const leg of [false,true])for(const side of ['Front','Back']){
  const a=withJoints(actor(),{waist:12}),base=jointPoint(a,leg?'thigh'+side:'upper'+side),target={x:base.x+80,y:base.y+120},solved=solveLimb(a,side,target,leg),nodes=jointTransforms(solved);
  const upper=nodes[(leg?'thigh':'upper')+side],middle=nodes[(leg?'shin':'fore')+side],end=nodes[(leg?'foot':'hand')+side];near(distance(upper,middle),leg?100:137);near(distance(middle,end),leg?105:115);near(distance(end,target),0);assert.ok(getJoints(solved)[(leg?'knee':'elbow')+side]>=0);
 }
 const result=solveTwoLink({x:1e9,y:0},137,115);assert.ok(Object.values(result).every(Number.isFinite));
 for(const input of [{x:0,y:0},{x:1e9,y:-1e9}]){const result=solveLimb(actor(),'Front',input);for(const [joint,value] of Object.entries(getJoints(result)))assert.ok(value>=JOINT_LIMITS[joint][0]&&value<=JOINT_LIMITS[joint][1]);}
});
test('paper mapping supports mirrored figures and crouching keeps floor contacts planted',()=>{
 for(const flip of [false,true]){const a={...actor(),flip},p={x:330,y:500},paper=canonicalToPaper(a,p),back=paperToCanonical(a,paper);near(back.x,p.x);near(back.y,p.y);const squat=crouchAt(a,a.y+6);for(const side of ['Front','Back']){const before=canonicalToPaper(a,jointPoint(a,'foot'+side)),after=canonicalToPaper(squat,jointPoint(squat,'foot'+side));near(distance(before,after),0);assert.ok(squat.joints['knee'+side]>40);}}
});
test('motion clips move elbows, neck, waist and knees rather than just root transforms',()=>{
 const a=actor(),actors=[a,{...a,x:62,flip:true}],context={referenceActors:actors,nextActors:actors,prop:{kind:'none',holder:-1}};
 const sample=type=>sampleAction(actors,{type,actor:0},.5,context).actors[0];assert.ok(sample('wave').joints.elbowFront>50);assert.ok(sample('nod').joints.neck>=0);assert.ok(sampleAction(actors,{type:'nod',actor:0},.3,context).actors[0].joints.neck>10);assert.ok(sample('bow').joints.waist>20);assert.ok(sample('crouch').joints.kneeFront>40);assert.ok(sample('kneel').joints.kneeFront>50);
 const bow=sample('bow');near(bow.x,a.x);near(bow.y,a.y);
});
test('walking bends knees and preserves the held arm; squat then stand returns to floor stance',()=>{
 const a=withJoints(actor(),{shoulderFront:75,elbowFront:68,wristFront:8}),walking=walkActor(a,.45,{x:a.x+12,y:a.y},true);assert.ok(walking.joints.kneeFront>2||walking.joints.kneeBack>2);near(walking.joints.shoulderFront,75);near(walking.joints.elbowFront,68);near(walking.joints.wristFront,8);
 const actors=[a,{...a,x:62}],context={referenceActors:actors,prop:{kind:'none',holder:-1}};const squat=sampleAction(actors,{type:'crouch',actor:0},1,context);const standing=sampleAction(squat.actors,{type:'stand',actor:0},1,context);near(standing.actors[0].y,a.y);assert.ok(standing.actors[0].joints.kneeFront<2);
});
test('new timelines carry action endings, honor durations and keep legacy twelve-second work intact',()=>{
 const legacy=defaultDraft();assert.equal(compilePlay(legacy),null);assert.equal(getPlayDuration(legacy),PLAY_DURATION);
 const d=starterDraft('blank');d.frames[0].actions=[{type:'crouch',actor:0,duration:2},{type:'stand',actor:0,duration:3}];const before=JSON.stringify(d),timeline=compilePlay(d),clips=timeline.segments.filter(s=>s.kind==='action');assert.equal(clips[0].duration,2000);assert.equal(clips[1].duration,3000);assert.ok(clips[1].actors[0].y>d.actors[0].y);assert.equal(getPlayDuration(d),timeline.duration);assert.equal(samplePlay(d,timeline.duration,false,timeline).progress,1);assert.equal(JSON.stringify(d),before);
});
test('a hand-edited middle pose is used by the stage and stored collection playback',()=>{
 const d=starterDraft('garden'),keys=materializeActionKeys(d,0,0);d.frames[0].actions[0].keys=keys;keys[4].actors[0]=withJoints(keys[4].actors[0],{neck:31,elbowFront:123,kneeFront:84});const restored=sanitizeDraft(JSON.parse(JSON.stringify(d))),timeline=compilePlay(restored),segment=timeline.segments.find(s=>s.kind==='action');const pose=sampleMotionTimeline(timeline,segment.start+segment.duration*.5);near(pose.actors[0].joints.neck,31);near(pose.actors[0].joints.elbowFront,123);near(pose.actors[0].joints.kneeFront,84);assert.equal(keys.length,9);
});
test('malformed actions, durations, poses and excessive joint angles are bounded on restore',()=>{
 const d=defaultDraft();d.actors[0].joints={neck:Infinity,elbowFront:999,kneeFront:-99};d.frames[0].actions=[{type:'remote'},{type:'wave',actor:99,duration:999,keys:[{t:.7,actors:d.actors},{t:.7,actors:d.actors},{t:.2,actors:d.actors}]},{type:'wait',duration:-2},{type:'nod',duration:NaN},{type:'bow'}];const clean=sanitizeDraft(d);assert.equal(clean.actors[0].joints.neck,0);assert.equal(clean.actors[0].joints.elbowFront,145);assert.equal(clean.actors[0].joints.kneeFront,0);assert.equal(clean.frames[0].actions.length,3);assert.equal(clean.frames[0].actions[0].duration,8);assert.equal(clean.frames[0].actions[1].duration,.7);assert.deepEqual(clean.frames[0].actions[0].keys.map(k=>k.t),[0,1]);
});
test('joint interpolation includes every independently articulated part without mutating endpoints',()=>{
 const a=withJoints(actor(),{neck:0,kneeFront:0}),b=withJoints(a,{neck:30,kneeFront:100}),c=blendActor(a,b,.5);near(c.joints.neck,15);near(c.joints.kneeFront,50);assert.equal(a.joints.neck,0);assert.equal(b.joints.kneeFront,100);
});
test('a planted walking foot remains at the same floor point until the next swing',()=>{
 const a=actor(),target={x:a.x+12,y:a.y},samples=[.4,.41,.42].map(u=>walkActor(a,u,target,true));const feet=samples.map(a=>canonicalToPaper(a,jointPoint(a,'footBack')));for(const p of feet.slice(1))near(distance(p,feet[0]),0,.05);
});
test('gift hands meet and the prop transfers once, while untouched actors remain editable',()=>{
 const d=starterDraft('lantern'),frame=d.frames[1],context={prop:frame.prop},a=sampleAction(frame.actors,{type:'offer',actor:0},.5,context),b=sampleAction(frame.actors,{type:'offer',actor:0},.6,context),hands=a.actors.map(a=>canonicalToPaper(a,jointPoint(a,'handFront',{x:0,y:14})));near(distance(hands[0],hands[1]),0,.05);assert.equal(a.prop.holder,0);assert.equal(b.prop.holder,1);assert.equal(frame.prop.holder,0);
});
test('standing from a kneeling clip returns both knees and feet to the reference stance',()=>{
 const actors=[actor(),{...actor(),x:66}],context={referenceActors:actors,prop:{kind:'none',holder:-1}},kneeling=sampleAction(actors,{type:'kneel',actor:0},1,context),standing=sampleAction(kneeling.actors,{type:'stand',actor:0},1,context).actors[0];near(standing.y,actors[0].y);assert.ok(standing.joints.kneeFront<2);for(const side of ['Front','Back'])near(distance(canonicalToPaper(standing,jointPoint(standing,'foot'+side)),canonicalToPaper(actors[0],jointPoint(actors[0],'foot'+side))),0);
});
test('joined acts reach custom next-act leg poses continuously and do not mutate stored keys',()=>{
 const d=starterDraft('blank');d.frames[0].actors[0].x=25;d.frames[1].actors[0]=withJoints({...d.frames[1].actors[0],x:60},{kneeFront:83,hipFront:38});const before=JSON.stringify(d),timeline=compilePlay(d),join=timeline.segments.find(s=>s.kind==='join'),end=join.start+join.duration,a=samplePlay(d,end-.01,false,timeline),b=samplePlay(d,end,false,timeline);near(a.actors[0].x,b.actors[0].x,.001);near(a.actors[0].joints.kneeFront,b.actors[0].joints.kneeFront,.001);assert.equal(JSON.stringify(d),before);
});
test('all starter motions remain finite and inside supported joint ranges throughout playback',()=>{
 for(const id of ['garden','lantern','farewell','home']){const d=starterDraft(id),timeline=compilePlay(d);for(let n=0;n<=100;n++){const frame=samplePlay(d,timeline.duration*n/100,false,timeline);for(const actor of frame.actors){assert.ok(Number.isFinite(actor.x)&&Number.isFinite(actor.y));for(const [key,value] of Object.entries(getJoints(actor)))assert.ok(value>=JOINT_LIMITS[key][0]&&value<=JOINT_LIMITS[key][1]);}}}
});
test('pulling hips beyond a straight or fully bent leg stops at physical reach without sliding feet',()=>{
 const a=actor();for(const y of [45,999]){const posed=crouchAt(a,y);for(const side of ['Front','Back'])near(distance(canonicalToPaper(a,jointPoint(a,'foot'+side)),canonicalToPaper(posed,jointPoint(posed,'foot'+side))),0,.05);assert.ok(posed.joints.kneeFront<=145);}
});
