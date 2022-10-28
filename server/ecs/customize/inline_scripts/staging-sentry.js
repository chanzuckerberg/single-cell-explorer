Sentry.init({
  dsn:
    "https://90fcc541642548e19559232a1f90d6d4@sentry.prod.si.czi.technology/35",
  environment: "staging",
  release: "cellxgene@89e398bd.32384b9",
  beforeBreadcrumb(breadcrumb, hint) {
    let target;
    if (breadcrumb.category === "ui.click") {
      try {
        target = hint.event.target
          ? htmlTreeAsString(hint.event.target)
          : htmlTreeAsString(hint.event);
      } catch (e) {
        target = `<unknown> - ${e.message}`;
      }
      breadcrumb.message = target;
    }
    return breadcrumb;
  },
});

/*
* The following functions are derived from Sentry.io(https://github.com/getsentry/sentry-javascript/blob/1204302906bbe74edc8a18f8ded047b3041059d7/packages/utils/src/misc.ts#L260)
* and modified for our use case

* BSD 3-Clause License

Copyright (c) 2018, Sentry
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * Given a child DOM element, returns a query-selector statement describing that
 * and its ancestors
 * e.g. [HTMLElement] => body > div > input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function htmlTreeAsString(elem) {
  try {
    let currentElem = elem;
    const MAX_TRAVERSE_HEIGHT = 5;
    const MAX_OUTPUT_LEN = 80;
    const out = [];
    let height = 0;
    let len = 0;
    const separator = " > ";
    const sepLength = separator.length;
    let nextStr;
    while (currentElem && height++ < MAX_TRAVERSE_HEIGHT) {
      nextStr = _htmlElementAsString(currentElem);
      // bail out if
      // - nextStr is the 'html' element
      // - the length of the string that would be created exceeds MAX_OUTPUT_LEN
      //   (ignore this limit if we are on the first iteration)
      if (
        nextStr === "html" ||
        (height > 1 &&
          len + out.length * sepLength + nextStr.length >= MAX_OUTPUT_LEN)
      ) {
        break;
      }
      out.push(nextStr);
      len += nextStr.length;
      currentElem = currentElem.parentNode;
    }
    return out.reverse().join(separator);
  } catch (err) {
    return `<unknown> - ${err.message}`;
  }
}
/**
 * Returns a simple, query-selector representation of a DOM element
 * e.g. [HTMLElement] => input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function _htmlElementAsString(el) {
  const elem = el;
  const out = [];
  let className;
  let classes;
  let key;
  let attr;
  let i;
  if (!elem || !elem.tagName) {
    return "";
  }
  out.push(elem.tagName.toLowerCase());
  if (elem.id) {
    out.push(`#${elem.id}`);
  }
  className = elem.className;
  if (
    className &&
    Object.prototype.toString.call(className) === "[object String]" // Check to see if className is a string
  ) {
    classes = className.split(/\s+/);
    for (i = 0; i < classes.length; i++) {
      out.push(`.${classes[i]}`);
    }
  }
  const allowedAttrs = [
    "type",
    "data-testid",
    "data-testclass",
    "name",
    "title",
    "alt",
  ];
  for (i = 0; i < allowedAttrs.length; i++) {
    key = allowedAttrs[i];
    attr = elem.getAttribute(key);
    if (attr) {
      out.push(`[${key}="${attr}"]`);
    }
  }
  return out.join("");
}
