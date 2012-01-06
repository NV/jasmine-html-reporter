'use strict';

jasmine.HtmlReporter = function() {};

(function() {

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
        vertex.element.classList.add('suite-fail');
        vertex.element.classList.remove('suite-pass');
      }
    } else if (!vertex.fail) {
      vertex.element.classList.add('suite-pass');
      vertex.titleLink.classList.add('title-link-pass');
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
        section.classList.add('suite');
        hx = document.createElement('h' + Math.min(i + 1, 6));
        hx.classList.add('suite-title');
        section.appendChild(hx);
        a = document.createElement('a');
        hx.appendChild(a);
        a.classList.add('title-link');
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
    section.classList.add('spec');
    hx = document.createElement('h' + Math.min(i + 1, 6));
    section.appendChild(hx);
    hx.classList.add('spec-title');
    a = document.createElement('a');
    a.classList.add('title-link');
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
        itemElement.classList.add('item');
        if (item.message instanceof Element) {
          itemElement.appendChild(item.message);
        } else {
          itemElement.textContent += item.message;
        }
        itemElement.classList.add(item.passed() ? 'item-pass' : 'item-fail');
        itemsHolder.appendChild(itemElement);
      }
      specElement.appendChild(itemsHolder);

      specElement.classList.add('spec-fail');
      vertex.titleLink.classList.add('title-link-fail');

      while ((vertex = vertex.parent) && !vertex.fail) {
        vertex.fail = true;
        vertex.element.classList.add('suite-fail');
        vertex.titleLink && vertex.titleLink.classList.add('title-link-fail');
      }
    } else {
      specElement.classList.add('spec-pass');
      vertex.titleLink.classList.add('title-link-pass');
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
    document.body.classList.remove('pass');
    document.body.classList.add('fail');
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
