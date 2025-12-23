/*jshint esversion: 6 */

var Cookie = {   

  set: function (name, value, days) {
    let expires = "";
    if (days) {
      let date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "expires=" + date.toGMTString() + ";";
    }
    document.cookie = name + "=" + value + ";" + expires + "path=/";
  },

  get: function (name) {
    let nameEQ = name + "=";
    for (let c of document.cookie.split(";")) {
      c = c.trimLeft();
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length);
    }
    return null;
  },

  delete: function (name) {
    Cookie.set(name, "", -1);
  }

};