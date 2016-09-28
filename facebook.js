///<reference path='shared.js'/>
/* global chrome */
var pendingFormat = '';
var calendarSettings = {};

var possibleParents = [
  'mbihjpcmockmpboapkcbppjkmjfajlfl', // Glen dev 1
  'egekinjjpolponbbfjimifpgfdmphomp', // published
  'oaehhoopdplfmlpeiedkiobifpchilef' // Glen dev 2
];
var parentExtId = '';

/*
 * Warning...
 * 
 * This code is very specific to the 'normal' English Google calendar layout and formats!
 * It has to read the screen and try to determine which dates are being displayed.
 * 
 */

function addDateInfo(watchedDomElement) {
  if (!watchedDomElement) {
    return;
  }

  var config = {
    classes: ''
  }

  var tag = watchedDomElement.tagName;
  var el = $(watchedDomElement); // may be null
  var time, originalElement;

  switch (tag) {
    case 'SPAN':
      var abbr = el.closest('abbr');
      if (abbr.data('bdateAdded')) {
        // log('already done a');
        return;
      }
      abbr.data('bdateAdded', true);
      var utime = abbr.data('utime');
      var when = new Date(0);
      when.setUTCSeconds(utime);
      time = when.getTime();
      originalElement = watchedDomElement;
      break;

    case 'ABBR':
      // var abbr = el;
      // if (abbr.data('bdateAdded')) {
      //   log('already done b');
      //   return;
      // }
      el.data('bdateAdded', true);

      var utime = el.data('utime');
      var when = new Date(0);
      when.setUTCSeconds(utime);
      time = when.getTime();
      originalElement = watchedDomElement;
      break;

    default:
      log('unexpected...');
      log(watchedDomElement);
      return;
  }


  var toInsert = [];

  chrome.runtime.sendMessage(parentExtId, {
    cmd: 'getInfo',
    targetDay: time,
    labelFormat: '{bMonthNamePri} {bDay}'
  },
    function (info) {
      var newElement = $('<span/>',
        {
          html: info.label,
          'class': 'bDay' + info.classes + config.classes,
          title: info.title
        });
      toInsert.push([originalElement, newElement]);
    });

  addThem(toInsert);
}

function addThem(toInsert) {
  chrome.runtime.sendMessage(parentExtId, {
    cmd: 'dummy' // just to get in the queue after all the ones above
  },
    function () {
      // console.log(`insert ${toInsert.length} elements`);
      for (var j = 0; j < toInsert.length; j++) {
        var item = toInsert[j];
        item[1].insertAfter(item[0]);
        $('<span role="presentation" aria-hidden="true"> · </span>').insertAfter(item[0]);
      }
    });
}

var refreshCount = 0;
function calendarUpdated(watchedDomElement) {
  refreshCount++;

  // seems to redraw twice on first load
  var threshold = 0;

  // log('updated!');
  // log(watchedDomElement);

  if (refreshCount > threshold) {
    addDateInfo(watchedDomElement);
  }
}

function calendarDefaults() {
  // window['INITIAL_DATA'][2][0][0].substr(window['INITIAL_DATA'][2][0][0].indexOf('dtFldOrdr')+12,3)

  var master = document.getElementById('calmaster').innerHTML;

  return {
    dtFldOrdr: master.match(/'dtFldOrdr','(.*?)'/)[1],
    defaultCalMode: master.match(/'defaultCalMode','(.*?)'/)[1],
    locale: master.match(/'locale','(.*?)'/)[1]
  }

  // other settings: 
  // 'dtFldOrdr','DMY'
  // 'firstDay','1'
  // 'defaultCalMode','week'
  // 'locale','en'

  // 0 MDY 12/31/2016
  // 1 DMY 31/12/2016
  // 2 YMD 2016-12-31
}

function byFormat(mdy, dmy, ymd) {
  switch (calendarSettings.dtFldOrdr) {
    case 'MDY':
      return mdy;
    case 'DMY':
      return dmy;
    case 'YMD':
      return ymd;
  }
  return '';
}

(function (win) {
  'use strict';

  var listeners = [],
    doc = win.document,
    MutationObserver = win.MutationObserver || win.WebKitMutationObserver,
    observer;

  function ready(selector, fn) {
    // Store the selector and callback to be monitored
    listeners.push({
      selector: selector,
      fn: fn
    });
    if (!observer) {
      // Watch for changes in the document
      observer = new MutationObserver(check);
      observer.observe(doc.documentElement, {
        childList: true,
        subtree: true
      });
    }
    // Check if the element is currently in the DOM
    check();
  }

  function check() {
    // Check the DOM for elements matching a stored selector
    for (var i = 0, len = listeners.length, listener, elements; i < len; i++) {
      listener = listeners[i];
      // Query for elements matching the specified selector
      elements = doc.querySelectorAll(listener.selector);
      for (var j = 0, jLen = elements.length, element; j < jLen; j++) {
        element = elements[j];
        // Make sure the callback isn't invoked with the 
        // same element more than once
        if (!element.ready) {
          element.ready = true;
          // Invoke the callback with the element
          listener.fn.call(element, element);
        }
      }
    }
  }

  // Expose `ready`
  win.ready = ready;

})(this);

function getStarted() {
  chrome.runtime.sendMessage(parentExtId, {
    cmd: 'getStorage',
    key: 'enableGCal',
    defaultValue: true
  },
    function (info) {
      if (info && info.value) {

        console.log(getMessage('confirmationMsg').filledWith(getMessage('title'))
          + ` (version ${chrome.runtime.getManifest().version})`
          + ` (main extension: ${parentExtId})`);

        ready('abbr.livetimestamp', function (el) {
          calendarUpdated(el);
        });
        ready('.timestampContent', function (el) {
          calendarUpdated(el);
        });
      }
    });
}

function findParentExtension() {
  // log('looking for parent extension - ' + possibleParents.length);
  var found = 0;
  var failed = 0;
  var tested = 0;
  // log(`Connecting to Badí Calendar Extension...`);
  for (var i = 0; i < possibleParents.length; i++) {
    var testId = possibleParents[i];
    tested++;

    chrome.runtime.sendMessage(testId, {
      cmd: 'connect'
    },
      function (info) {
        var msg = chrome.runtime.lastError;
        if (msg) {
          failed++;
          // log(tested, found, failed)
        } else {
          found++;
          // log(tested, found, failed)
          if (found > 1) {
            // ! already found one... this is a second copy?
          } else {
            if (info && info.value === 'Wondrous Calendar!') {
              parentExtId = info.id;
              getStarted();
            }
          }
        }
        if (tested === (found + failed)) {
          if (!found) {
            log(`Tested ${possibleParents.length} extension ids. Did not find the Badí' Calendar extension (version 3+).`)
            log(tested, found, failed)
          }
        }
      });
  }
}

function showErrors() {
  var msg = chrome.runtime.lastError;
  if (msg) {
    log(msg);
  }
}




findParentExtension();

