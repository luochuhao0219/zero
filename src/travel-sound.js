import {TheaterScore} from './theater-score.js';
/** One chamber score follows the journey; the free-stage score takes the foreground. */
export class TravelSound {
 constructor(context){this.context=context;this.enabled=false;this.warmth=0;this.ducked=false;this.score=new TheaterScore(context,'strings',.32);}
 set(progress,enabled,playing=false){
  const warmth=playing?1:Math.max(0,Math.min(1,(progress-.25)/.6));
  this.warmth=warmth;this.score.setWarmth(warmth);
  if(enabled!==this.enabled){this.enabled=enabled;if(enabled)this.score.start();else this.score.stop();}
  const volume=enabled?(this.ducked?0:.24+warmth*.12):0;if(this.lastVolume!==volume){this.score.setVolume(volume);this.lastVolume=volume;}
 }
 duck(active){this.ducked=active;this.lastVolume=null;this.set(this.warmth*.6+.25,this.enabled);}
}
