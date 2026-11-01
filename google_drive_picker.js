// Google's hosted picker grants drive.file access to each selected document.
(() => {
  let loading;
  let active = false;
  function loadPicker() {
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Picker load timed out')), 20000);
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onerror = () => { clearTimeout(timer); reject(new Error('Picker unavailable')); };
        script.onload = () => gapi.load('picker', {
          callback: () => { clearTimeout(timer); resolve(); },
          onerror: () => { clearTimeout(timer); reject(new Error('Picker unavailable')); }
        });
        document.head.appendChild(script);
      }).catch(error => { loading = undefined; throw error; });
    }
    return loading;
  }
  window.calcrowDrivePicker = {
    async pick(token, key, appId, mimeTypes, foldersOnly) {
      if (active) throw new Error('Picker already open');
      active = true;
      try {
        await loadPicker();
        return await new Promise((resolve, reject) => {
          const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(foldersOnly)
            .setMimeTypes(mimeTypes);
          let picker;
          const finish = value => { picker.dispose(); resolve(value); };
          picker = new google.picker.PickerBuilder()
            .setAppId(appId)
            .setDeveloperKey(key)
            .setOAuthToken(token)
            .setOrigin(window.location.origin)
            .addView(view)
            .setCallback(data => {
              if (data.action === google.picker.Action.CANCEL) finish(null);
              if (data.action === google.picker.Action.PICKED) {
                const fileId = data.docs?.[0]?.id;
                if (fileId) finish(JSON.stringify({fileId}));
                else { picker.dispose(); reject(new Error('Picker returned no file')); }
              }
              if (data.action === 'error') {
                picker.dispose(); reject(new Error('Picker failed'));
              }
            })
            .build();
          picker.setVisible(true);
        });
      } finally { active = false; }
    }
  };
})();
