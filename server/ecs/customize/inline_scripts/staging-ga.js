function installGA(id) {
  (function(i, s, o, g, r, a, m) {
    i["GoogleAnalyticsObject"] = r;
    (i[r] =
      i[r] ||
      function() {
        (i[r].q = i[r].q || []).push(arguments);
      }),
      (i[r].l = 1 * new Date());
    (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m);
  })(
    window,
    document,
    "script",
    "https://www.google-analytics.com/analytics.js",
    "ga"
  );

  ga("create", id, "auto");
  ga("set", "anonymizeIp", true);
  ga("send", "pageview");
}
window.cookieDecisionCallback = function() {
  installGA("UA-164217286-3");
};
var c = false;
try {
  c = "yes" === window.localStorage.getItem("cxg.cookieDecision");
} catch (e) {}
if (c) {
  window.cookieDecisionCallback();
}
