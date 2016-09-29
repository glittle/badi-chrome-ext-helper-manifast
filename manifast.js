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
      var txt = el.text();
      if(!txt){
        return;
      }
      var date = moment(txt, '-, D MMM YYYY');

      time = date.valueOf();
      originalElement = watchedDomElement;
      break;

    default:
      log('unexpected...');
      log(watchedDomElement);
      return;
  }


  var toInsert = [];
  $('.bDay').remove();

  chrome.runtime.sendMessage(parentExtId, {
    cmd: 'getInfo',
    targetDay: time,
    labelFormat: '{bDay} {bMonthNamePri} {bYear}'
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
      }
    });
}

var refreshCount = 0;
function calendarUpdated(watchedDomElement) {
  refreshCount++;

  var threshold = 0;

  // log('updated!');
  // log(watchedDomElement);

  if (refreshCount > threshold) {
    addDateInfo(watchedDomElement);
  }
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

        ready('span.commentDateLong', function (el) {
          calendarUpdated(el);
        });

        $('span.commentDateLong').on('DOMSubtreeModified', function (ev) {
          calendarUpdated(ev.target);
        })
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