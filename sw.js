const CACHE='saovang-checkin-v36';
const ASSETS=['./','./index.html','./styles.css?v=19','./app.js?v=19','./attendance-io.js?v=19','./revenue-delete.js?v=36','./manager-close.js?v=19','./shift-controls.js?v=32','./manager-export.js?v=19','./shift-summary.js?v=19','./saovang-branch.js?v=19','./saovang-banks.js?v=36','./saovang-delete-no-confirm.js?v=23','./saovang-debt-edit.js?v=27','./saovang-active-collapse.js?v=29','./saovang-history-reopen.js?v=33','./saovang-history-edit-actions.js?v=33','./saovang-manager-edit-save.js?v=33','./saovang-daily-summary.js?v=36','./manifest.webmanifest?v=19','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  // Never cache Supabase/API or any cross-origin request; always use live data.
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        return response;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  // Frequently changed control/summary files always come from the network first.
  if(url.pathname.endsWith('/shift-controls.js')||url.pathname.endsWith('/revenue-delete.js')||url.pathname.endsWith('/saovang-banks.js')||url.pathname.endsWith('/saovang-history-reopen.js')||url.pathname.endsWith('/saovang-history-edit-actions.js')||url.pathname.endsWith('/saovang-manager-edit-save.js')||url.pathname.endsWith('/saovang-daily-summary.js')||url.pathname.endsWith('/saovang-manager-branch.js')||url.pathname.endsWith('/saovang-manager-banks.js')){
    event.respondWith(
      fetch(event.request,{cache:'reload'}).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      }).catch(()=>caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }))
  );
});
