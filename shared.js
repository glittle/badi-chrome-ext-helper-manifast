/* Code by Glen Little */
/* global HolyDays */
/* global moment */
var ObjectConstant = '$****$';
var splitSeparator = /[,،]+/;
var _cachedMessages = {};


// based on code by Sunwapta Solutions Inc.

function setStorage(key, value) {
  /// <summary>Save this value in the browser's local storage. Dates do NOT get returned as full dates!</summary>
  /// <param name="key" type="string">The key to use</param>
  /// <param name="value" type="string">The value to store. Can be a simple or complex object.</param>
  if (value === null) {
    localStorage.removeItem(key);
    return null;
  }
  if (typeof value === 'object' || typeof value === 'boolean') {
    var strObj = JSON.stringify(value);
    value = ObjectConstant + strObj;
  }

  localStorage[key] = value + "";

  return value;
}


function getStorage(key, defaultValue) {
  /// <summary>Get a value from storage.</summary>
  var checkForObject = function (obj) {
    if (obj.substring(0, ObjectConstant.length) === ObjectConstant) {
      obj = $.parseJSON(obj.substring(ObjectConstant.length));
    }
    return obj;
  };

  var value = localStorage[key];
  if (typeof value !== 'undefined' && value != null) {
    return checkForObject(value);
  }
  return defaultValue;
}

String.prototype.filledWith = function () {
  /// <summary>Similar to C# String.Format...  in two modes:
  /// 1) Replaces {0},{1},{2}... in the string with values from the list of arguments. 
  /// 2) If the first and only parameter is an object, replaces {xyz}... (only names allowed) in the string with the properties of that object. 
  /// Notes: the { } symbols cannot be escaped and should only be used for replacement target tokens;  only a single pass is done. 
  /// </summary>

  var values = typeof arguments[0] === 'object' && arguments.length === 1 ? arguments[0] : arguments;

  //  var testForFunc = /^#/; // simple test for "#"
  var testForElementAttribute = /^\*/; // simple test for "#"
  var testDoNotEscapeHtml = /^\^/; // simple test for "^"
  var testDoNotEscpaeHtmlButToken = /^-/; // simple test for "-"
  var testDoNotEscpaeHtmlButSinglQuote = /^\>/; // simple test for ">"

  var extractTokens = /{([^{]+?)}/g;

  var replaceTokens = function (input) {
    return input.replace(extractTokens, function () {
      var token = arguments[1];
      var value;
      //try {
      if (token[0] === ' ') {
        // if first character is a space, do not process
        value = '{' + token + '}';
      } else if (values === null) {
        value = '';
      }
        //else if (testForFunc.test(token)) {
        //  try {
        //    debugger;
        //    log('eval... ' + token);
        //    value = eval(token.substring(1));
        //  }
        //  catch (e) {
        //    // if the token cannot be executed, then pass it through intact
        //    value = '{' + token + '}';
        //  }
        //}
      else if (testForElementAttribute.test(token)) {
        value = quoteattr(values[token.substring(1)]);
      } else if (testDoNotEscpaeHtmlButToken.test(token)) {
        value = values[token.substring(1)].replace(/{/g, '&#123;');
      } else if (testDoNotEscpaeHtmlButSinglQuote.test(token)) {
        value = values[token.substring(1)].replace(/'/g, "%27");
      } else if (testDoNotEscapeHtml.test(token)) {
        value = values[token.substring(1)];
      } else {
        if (values.hasOwnProperty(token)) {
          var toEscape = values[token];
          //value = typeof toEscape == 'undefined' || toEscape === null ? '' : ('' + toEscape).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/{/g, '&#123;');
          //Never escape HTML in this Chrome Extension
          value = toEscape === 0 ? 0 : (toEscape || '');
        } else {
          if (_nextFilledWithEach_UsesExactMatchOnly) {
            value = '{' + token + '}';
          } else {
            log('missing property for filledWith: ' + token);
            //debugger;
            value = '';
          }
        }
      }


      //REMOVE try... catch to optimize in this project... not dealing with unknown and untested input

      //          } catch (err) {
      //            log('filledWithError:\n' +
      //                err +
      //                '\ntoken:' +
      //                token +
      //                '\nvalue:' +
      //                value +
      //                '\ntemplate:' +
      //                input +
      //                '\nall values:\n');
      //            log(values);
      //            throw 'Error in Filled With';
      //          }
      return (typeof value == 'undefined' || value == null ? '' : ('' + value));
    });
  };

  var result = replaceTokens(this);

  var lastResult = '';
  while (lastResult !== result) {
    lastResult = result;
    result = replaceTokens(result);
  }

  return result;
};

function quoteattr(s, preserveCr) {
  preserveCr = preserveCr ? '&#13;' : '\n';
  return ('' + s) /* Forces the conversion to string. */
      .replace(/&/g, '&amp;') /* This MUST be the 1st replacement. */
      .replace(/'/g, '&apos;') /* The 4 other predefined entities, required. */
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      /*
      You may add other replacements here for HTML only 
      (but it's not necessary).
      Or for XML, only if the named entities are defined in its DTD.
      */
      .replace(/\r\n/g, preserveCr) /* Must be before the next replacement. */
      .replace(/[\r\n]/g, preserveCr);
}


String.prototype.filledWithEach = function (arr) {
  /// <summary>Silimar to 'filledWith', but repeats the fill for each item in the array. Returns a single string with the results.
  /// </summary>
  if (arr === undefined || arr === null) {
    return '';
  }
  var result = [];
  for (var i = 0, max = arr.length; i < max; i++) {
    result[result.length] = this.filledWith(arr[i]);
  }
  _nextFilledWithEach_UsesExactMatchOnly = false;
  return result.join('');
};


function getMessage(key, obj, defaultValue) {
  var rawMsg = _cachedMessages[key];
  if (!rawMsg) {
    rawMsg = chrome.i18n.getMessage(key);
    _cachedMessages[key] = rawMsg;
  }

  var msg = rawMsg || defaultValue || '{' + key + '}';
  if (obj === null || typeof obj === 'undefined' || msg.search(/{/) === -1) {
    return msg;
  }

  var before = msg;
  var repeats = 0;
  while (repeats < 5) { // failsafe
    msg = msg.filledWith(obj);
    if (msg === before) {
      return msg;
    }
    if (msg.search(/{/) === -1) {
      return msg;
    }
    before = msg;
    repeats++;
  }
  return msg;

}


function log() {
  // add a timestamp to console log entries
  //  var a = ['%c'];
  //  a.push('display: block; text-align: right;');
  //  a.push(new moment().format('DD H:mm:ss'));
  //  a.push('\n');
  var a = ['\n'];
  for (var x in log.arguments) {
    if (log.arguments.hasOwnProperty(x)) {
      a.push(log.arguments[x]);
    }
  }
  console.log.apply(console, a);
}


