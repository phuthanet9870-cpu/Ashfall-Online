// Versioned chunk documents keep each Durable Object value below its 128 KiB limit.
export function documents(storage) {
  const read = async (key, db = storage) => {
    const manifest = await db.get(key);
    if (!manifest) return null;
    if (manifest.format !== 1) return manifest;
    const parts = await Promise.all(Array.from({length:manifest.parts},(_,i)=>db.get(`${key}:${manifest.version}:${i}`)));
    if (parts.some(p=>typeof p!=='string')) throw new Error('Incomplete durable document: '+key);
    let text=parts.join('');
    if(manifest.encoding==='gzip'){const binary=atob(text),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
    return JSON.parse(text);
  };
  // Compression is prepared outside the storage transaction so its CPU/stream work does not hold the DB lock.
  const prepare = async ([key,value,raw]) => {
    if(raw)return {key,value,raw:true};
    const text=JSON.stringify(value);if(text.length>16*1024*1024)throw new Error('Document exceeds storage limit');let data=text,encoding='json';
    if(text.length>20000){const bytes=new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));data=btoa(binary);encoding='gzip';}
    return {key,data,encoding,version:crypto.randomUUID(),parts:Math.ceil(data.length/12000)};
  };
  const write = async (db,entry) => {
    const {key,data,encoding,version,parts}=entry,previous=await db.get(key);
    for(let i=0;i<parts;i++)await db.put(`${key}:${version}:${i}`,data.slice(i*12000,(i+1)*12000));
    await db.put(key,{format:1,version,parts,encoding});
    if(previous?.format===1)for(let i=0;i<previous.parts;i++)await db.put(`${key}:${previous.version}:${i}`,null);
  };
  return {read,async commit(entries){
    if(!storage.transaction)throw new Error('Transactional storage is required');
    const prepared=await Promise.all(entries.map(prepare));
    await storage.transaction(async db=>{for(const entry of prepared)if(entry.raw)await db.put(entry.key,entry.value);else await write(db,entry);});
  }};
}
