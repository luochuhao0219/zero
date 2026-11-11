import {COMPOSITION_KEY,DRAFT_KEY,readJSON,readCompositions,sanitizeDraft} from './explore-data.js';
export function restoreStudio(storage){const saved=readJSON(storage,DRAFT_KEY,null),works=readCompositions(storage);return {draft:sanitizeDraft(saved),works,editingWork:works.find(w=>w.id&&w.id===saved?.editingId)||null};}
/** Commit the gallery before replacing live references, preserving originals on quota errors. */
export function saveStudioWork(storage,works,editingWork,draft,image){
  const index=works.findIndex(w=>w===editingWork||w.id&&w.id===editingWork?.id);
  const work={id:editingWork?.id||globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,title:draft.title.trim()||'无题小戏',image,date:new Date().toISOString(),draft:sanitizeDraft(draft)};
  const next=index>=0?works.map((w,i)=>i===index?work:w):[work,...works].slice(0,6);storage.setItem(COMPOSITION_KEY,JSON.stringify(next));return {works:next,work};
}
