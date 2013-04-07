'use strict';

jasmine.HtmlReporter = function() {};

(function() {

  var addClass = (function() {
    if (document.createElement("div").classList !== undefined) {
      return function(elem, className) {
        elem.classList.add(className);
      };
    } else {
      return function(elem, className) {
        var classList = elem.className.trim().split(/\s+/);
        if (classList.indexOf(className) === -1) {
          classList.push(className);
          elem.className = classList.join(" ");
        }
      };
    }
  })();
  
  var removeClass = (function() {
    if (document.createElement("div").classList !== undefined) {
      return function(elem, className) {
        elem.classList.remove(className);
      };
    } else {
      return function(elem, className) {
        var classList = elem.className.trim().split(/\s+/);
        var idx = classList.indexOf(className);
        if (idx !== -1) {
          classList.splice(idx, 1);
          elem.className = classList.join(" ");
        }
      };
    }
  })();

  var tree;
  var specsMap = {};
  var suitesMap = {};
  var hasFailed;

  jasmine.HtmlReporter.prototype.reportRunnerStarting = function() {
    tree = new Vertex();
    tree.element = document.body;
  };

  jasmine.HtmlReporter.prototype.reportRunnerResults = function(results) {
    if (!hasFailed) {
      setFavicon('favicon_pass');
    }
  };

  jasmine.HtmlReporter.prototype.reportSuiteResults = function(suite) {
    var results = suite.results();
    var vertex = suitesMap[suite.id];
    if (!vertex) {
      window.console && console.warn('must be skipped'); //FIXME
      return;
    }
    if (results.failedCount) {
      if (!vertex.fail) {
        addClass(vertex.element, 'suite-fail');
        removeClass(vertex.element, 'suite-pass');
      }
    } else if (!vertex.fail) {
      addClass(vertex.element, 'suite-pass');
      addClass(vertex.titleLink, 'title-link-pass');
    }
  };

  jasmine.HtmlReporter.prototype.reportSpecStarting = function(spec) {
    var suite = spec.suite;
    var suites = [suite.description];
    var suitesIds = [suite.id];
    while (suite = suite.parentSuite) {
      suites.push(suite.description);
      suitesIds.push(suite.id);
    }
    suites.reverse();
    suitesIds.reverse();

    var vertex = tree;
    var section;
    var hx;
    var a;

    for (var i = 0, length = suites.length; i < length; i++) {
      var suiteName = suites[i];
      if (!vertex.children.hasOwnProperty(suiteName)) {
        section = document.createElement('section');
        addClass(section, 'suite');
        hx = document.createElement('h' + Math.min(i + 1, 6));
        addClass(hx, 'suite-title');
        section.appendChild(hx);
        a = document.createElement('a');
        hx.appendChild(a);
        addClass(a, 'title-link');
        a.textContent = suiteName;
        a.href = '?spec=' + (section.id = encodePath(suites.slice(0, i + 1)));

        vertex = vertex.add(suiteName, section);
        vertex.titleLink = a;
      } else {
         vertex = vertex.children[suiteName];
      }
      suitesMap[suitesIds[i]] = vertex;
    }

    section = document.createElement('section');
    addClass(section, 'spec');
    hx = document.createElement('h' + Math.min(i + 1, 6));
    section.appendChild(hx);
    addClass(hx, 'spec-title');
    a = document.createElement('a');
    addClass(a, 'title-link');
    hx.appendChild(a);
    a.textContent = spec.description;
    suites.push(spec.description);
    a.href = '?spec=' + (section.id = encodePath(suites));

    vertex = vertex.add(spec.id, section);
    vertex.titleLink = a;

    specsMap[spec.id] = vertex;
  };

  jasmine.HtmlReporter.prototype.reportSpecResults = function(spec) {
    var results = spec.results();
    if (results.skipped) return; //TODO: draw skipped tests gray or blue or something

    var vertex = specsMap[spec.id];
    var specElement = vertex.element;
    var fail = results.failedCount;
    if (fail) {
      if (!hasFailed) {
        hasFailed = true;
        onFirstFail();
      }
      var itemsHolder = document.createElement('ol');
      var items = results.getItems();
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var itemElement = document.createElement('li');
        addClass(itemElement, 'item');
        if (item.message instanceof Element) {
          itemElement.appendChild(item.message);
        } else {
          itemElement.textContent += item.message;
        }
        addClass(itemElement, item.passed() ? 'item-pass' : 'item-fail');
        itemsHolder.appendChild(itemElement);
      }
      specElement.appendChild(itemsHolder);

      addClass(specElement, 'spec-fail');
      addClass(vertex.titleLink, 'title-link-fail');

      while ((vertex = vertex.parent) && !vertex.fail) {
        vertex.fail = true;
        addClass(vertex.element, 'suite-fail');
        vertex.titleLink && addClass(vertex.titleLink, 'title-link-fail');
      }
    } else {
      addClass(specElement, 'spec-pass');
      addClass(vertex.titleLink, 'title-link-pass');
    }
  };

  jasmine.HtmlReporter.prototype.specFilter = function(spec) {
    var parts = [spec.description];
    var suite = spec.suite;
    do {
      parts.push(suite.description);
    } while (suite = suite.parentSuite);
    parts.reverse();

    var specParam = getParams().spec;

    if (!specParam) {
      return true;
    }

    var currentParts = specParam.split('/');

    for (var i = 0; i < currentParts.length; i++) {
      if (currentParts[i] !== encodeURIComponent(parts[i])) {
        return false;
      }
    }
    return true;
  };

  function getParams() {
    var paramMap = {};
    var params = location.search.slice(1).split('&');

    for (var i = 0; i < params.length; i++) {
      var p = params[i].split('=');
      paramMap[p[0]] = p[1];
    }

    return paramMap;
  }

  function Vertex() {
    this.element = null;
    this.parent = null;
    this.titleLink = null;
    this.children = {};
  }

  Vertex.prototype.add = function(name, element) {
    var newVertex = new Vertex;
    newVertex.parent = this;
    newVertex.element = element;
    this.children[name] = newVertex;
    this.element.appendChild(element);
    return newVertex;
  };

  function encodePath(parts) {
      for (var i = parts.length; i--;) {
      parts[i] = encodeURIComponent(parts[i]);
    }
    return parts.join('/');
  }

  function onFirstFail() {
    removeClass(document.body, 'pass');
    addClass(document.body, 'fail');
    setFavicon('favicon_fail');
  }

  var favicons = {};

  /**
   * @param {string} id of the link element that holds favicon URL
   * @see http://stackoverflow.com/a/260876/16185
   */
  function setFavicon(id) {
    if (!favicons.hasOwnProperty(id)) {
      favicons[id] = document.getElementById(id).href;
    }
    if (setFavicon.last_) {
      setFavicon.last_.parentNode.removeChild(setFavicon.last_);
    }
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = favicons[id];
    setFavicon.last_ = link;
    (document.head || document.getElementsByTagName('head')[0]).appendChild(link);
  }

})();
