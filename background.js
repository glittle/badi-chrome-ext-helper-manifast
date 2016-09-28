/* Code by Glen Little */

/*
 */

var BackgroundModule = function () {

  function installed(info) {
    if (info.reason == 'update') {
      setTimeout(function () {
        var newVersion = chrome.runtime.getManifest().version;
        var oldVersion = localStorage.updateVersion;
        if (newVersion != oldVersion) {
          log(oldVersion + ' --> ' + newVersion);
          localStorage.updateVersion = newVersion;
          chrome.tabs.create({
            url: getMessage(browserHostType + '_History') + '?{0}:{1}'.filledWith(
              chrome.runtime.getManifest().version,
              _languageCode)
          });

        } else {
          log(newVersion);
        }
      }, 1000);
    } else {
      log(info);
    }
  }

  function showErrors() {
    var msg = chrome.runtime.lastError;
    if (msg) {
      log(msg);
    }
  }

  function prepare() {
    log('prepared background in Badí Calendar Facebook helper');
  }

  return {
    prepare: prepare
  };
}

var _backgroundModule = new BackgroundModule();

$(function () {
  _backgroundModule.prepare();
});
