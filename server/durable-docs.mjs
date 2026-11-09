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
  const write = async (db,key,value) => {
    const previous=await db.get(key), raw=JSON.stringify(value), version=crypto.randomUUID();let data=raw,encoding='json';
    if(raw.length>20000){const bytes=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);data=btoa(binary);encoding='gzip';}
    const parts=Math.ceil(data.length/12000);
    if(raw.length>16*1024*1024)throw new Error('Document exceeds storage limit');
    for(let i=0;i<parts;i++)await db.put(`${key}:${version}:${i}`,data.slice(i*12000,(i+1)*12000));
    await db.put(key,{format:1,version,parts,encoding});
    if(previous?.format===1)for(let i=0;i<previous.parts;i++)await db.put(`${key}:${previous.version}:${i}`,null);
  };
  return {read,async commit(entries){
    if(!storage.transaction)throw new Error('Transactional storage is required');
    await storage.transaction(async db=>{for(const [key,value,raw]of entries)if(raw)await db.put(key,value);else await write(db,key,value);});
  }};
}
