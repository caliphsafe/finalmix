export interface SavedProject { id:string; name:string; created:string; file:Blob; settings:unknown; }
const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('finalmix-private',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function run<T>(mode:IDBTransactionMode,fn:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('projects',mode),r=fn(tx.objectStore('projects'));let result:T;r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error)}})}
export const listProjects=()=>run('readonly',s=>s.getAll()) as Promise<SavedProject[]>;
export const saveProject=(p:SavedProject)=>run('readwrite',s=>s.put(p));
export const deleteProject=(id:string)=>run('readwrite',s=>s.delete(id));
export const clearProjects=()=>run('readwrite',s=>s.clear());
