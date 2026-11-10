/** Persist before changing the UI so a failed write cannot resurrect a deleted work. */
export function deleteSavedWork(storage,key,data,work){
  const works=Array.isArray(data)?data:data.works;
  const index=works.indexOf(work);
  if(index<0)return data;
  const remaining=works.filter((_,i)=>i!==index);
  const next=Array.isArray(data)?remaining:{...data,works:remaining};
  storage.setItem(key,JSON.stringify(next));
  return next;
}

/** Shared download/delete controls, including an inline confirmation for each work. */
export function createWorkActions({title,onDownload,onDelete,extraActions=[]}){
  const actions=document.createElement('div');actions.className='work-actions';
  const download=document.createElement('button'),remove=document.createElement('button');
  download.type=remove.type='button';download.textContent='下载 ↗';download.setAttribute('aria-label',`下载留影：${title}`);
  remove.textContent='删除';remove.className='work-delete';remove.dataset.deleteWork='';remove.setAttribute('aria-label',`删除留影：${title}`);
  download.addEventListener('click',onDownload);
  const extras=extraActions.map(({label,onClick})=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',`${label}：${title}`);button.addEventListener('click',onClick);return button;});
  const restore=()=>{actions.replaceChildren(...extras,download,remove);remove.focus({preventScroll:true});};
  remove.addEventListener('click',()=>{
    const question=document.createElement('span'),cancel=document.createElement('button'),confirm=document.createElement('button');
    question.className='work-delete-question';question.textContent='删除这张留影？';question.setAttribute('role','status');
    cancel.type=confirm.type='button';cancel.textContent='取消';confirm.textContent='确认删除';confirm.className='work-delete';
    confirm.setAttribute('aria-label',`确认删除留影：${title}`);
    cancel.addEventListener('click',restore);
    confirm.addEventListener('click',()=>{
      const shelf=actions.closest('.works-grid,.ex-personal-grid'),fallback=actions.closest('dialog')?.querySelector('button');
      if(onDelete()===false){restore();return;}
      (shelf?.querySelector('[data-delete-work]')||fallback)?.focus({preventScroll:true});
    });
    actions.replaceChildren(question,cancel,confirm);cancel.focus({preventScroll:true});
  });
  actions.append(...extras,download,remove);return actions;
}
