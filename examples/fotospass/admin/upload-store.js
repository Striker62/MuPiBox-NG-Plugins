/* Only the host-provided Admin SDK may access original photo files. */
(() => {
  'use strict';
  const folder='originale';
  function safeName(name){return typeof name==='string'&&/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(jpe?g|png|webp|gif)$/i.test(name)&&!name.includes('..');}
  function fileName(source,unique){
    const stem=source.replace(/\.[^.]*$/,'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'foto';
    if(!/^[a-f0-9-]{16,64}$/i.test(unique))throw Error('Ungültige Upload-Kennung.');
    return 'original-'+stem+'-'+unique+'.jpg';
  }
  function create(sdk){
    return {
      async list(){
        const result=await sdk.files.list(folder);
        return {entries:(result.entries||[]).filter(row=>!row.isDir&&safeName(row.name)).map(row=>({name:row.name,path:folder+'/'+row.name})),truncated:result.truncated===true};
      },
      async read(name){
        if(!safeName(name))throw Error('Ungültiger Bildname.');
        return sdk.files.read(folder+'/'+name);
      },
      async upload(source,blob,unique){
        if(!(blob instanceof Blob)||blob.type!=='image/jpeg'||!blob.size||blob.size>8*1024*1024)throw Error('Die JPEG-Kopie ist leer, ungültig oder größer als 8 MiB.');
        const head=new Uint8Array(await blob.slice(0,3).arrayBuffer());
        if(head[0]!==255||head[1]!==216||head[2]!==255)throw Error('Die Upload-Kopie enthält keine gültigen JPEG-Daten.');
        const name=fileName(source,unique);
        const result=await sdk.files.write(folder+'/'+name,blob,{expectedRevision:''});
        return {name,revision:result.revision};
      }
    };
  }
  if(typeof module!=='undefined')module.exports={create,fileName,safeName};
  if(typeof window!=='undefined')window.FotoUploadStore={create};
})();
