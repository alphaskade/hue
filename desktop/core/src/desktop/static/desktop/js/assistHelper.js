// Licensed to Cloudera, Inc. under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  Cloudera, Inc. licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var TIME_TO_LIVE_IN_MILLIS = 86400000; // 1 day

/**
 * @param options {object}
 * @param options.app
 * @param options.user
 *
 * @constructor
 */
function AssistHelper (options) {
  var self = this;
  self.options = options;
}

AssistHelper.prototype.hasExpired = function (timestamp) {
  return (new Date()).getTime() - timestamp > TIME_TO_LIVE_IN_MILLIS;
};

AssistHelper.prototype.getTotalStorageUserPrefix = function () {
  var self = this;
  var app = "";
  if (typeof self.options.app != "undefined") {
    app = self.options.app;
  }
  if (typeof self.options.user != "undefined") {
    return app + "_" + self.options.user;
  }
  return app;
};

AssistHelper.prototype.fetchTableHtmlPreview = function(databaseName, tableName, successCallback, errorCallback) {
  var self = this;
  $.ajax({
    url: "/" + self.options.app + "/api/table/" + databaseName + "/" + tableName,
    data: {"sample": true},
    beforeSend: function (xhr) {
      xhr.setRequestHeader("X-Requested-With", "Hue");
    },
    dataType: "html",
    success: successCallback,
    error: errorCallback
  });
};

AssistHelper.prototype.refreshTableStats = function(databaseName, tableName, successCallback, errorCallback) {
  var self = this;
  var pollRefresh = function (url) {
    $.post(url, function (data) {
      if (data.isSuccess) {
        successCallback(data);
      } else if (data.isFailure) {
        errorCallback(data.message);
      } else {
        window.setTimeout(function () {
          pollRefresh(url);
        }, 1000);
      }
    }).fail(errorCallback);
  };

  $.post("/" + self.options.app + "/api/analyze/" + databaseName + "/" + tableName + "/", function (data) {
    if (data.status == 0 && data.watch_url) {
      pollRefresh(data.watch_url);
    } else {
      errorCallback();
    }
  }).fail(errorCallback);
};

AssistHelper.prototype.fetchStats = function(databaseName, tableName, columnName, successCallback, errorCallback) {
  var self = this;
  $.ajax({
    url: "/" + self.options.app + "/api/table/" + databaseName + "/" + tableName + "/stats/" + (columnName || ""),
    data: {},
    beforeSend: function (xhr) {
      xhr.setRequestHeader("X-Requested-With", "Hue");
    },
    dataType: "json",
    success: successCallback,
    error: errorCallback
  });
};

AssistHelper.prototype.fetchTerms = function(databaseName, tableName, columnName, prefixFilter, successCallback, errorCallback) {
  var self = this;
  $.ajax({
    url: "/" + self.options.app + "/api/table/" + databaseName + "/" + tableName + "/terms/" + columnName + "/" + (prefixFilter || ""),
    data: {},
    beforeSend: function (xhr) {
      xhr.setRequestHeader("X-Requested-With", "Hue");
    },
    dataType: "json",
    success: successCallback,
    error: errorCallback
  });
};

AssistHelper.prototype.fetchDatabases = function(successCallback, errorCallback) {
  var self = this;
  self.fetchAssistData("/" + self.options.app + "/api/autocomplete/", successCallback, errorCallback);
};

AssistHelper.prototype.fetchTables = function(databaseName, successCallback, errorCallback) {
  var self = this;
  self.fetchAssistData("/" + self.options.app + "/api/autocomplete/" + databaseName, successCallback, errorCallback);
};

AssistHelper.prototype.fetchFields = function(databaseName, tableName, fields, successCallback, errorCallback) {
  var self = this;

  var fieldPart = fields.length > 0 ? "/" + fields.join("/") : "";
  self.fetchAssistData("/" + self.options.app + "/api/autocomplete/" + databaseName + "/" + tableName + fieldPart, successCallback, errorCallback);
};

AssistHelper.prototype.clearCache = function() {
  var self = this;
  $.totalStorage("hue.assist." + self.getTotalStorageUserPrefix(), {});
};

AssistHelper.prototype.fetchPanelData = function (hierarcy, successCallback, errorCallback) {
  var self = this;
  self.fetchAssistData("/" + self.options.app + "/api/autocomplete/" + hierarcy.join("/"), successCallback, errorCallback);
};

AssistHelper.prototype.fetchAssistData = function (url, successCallback, errorCallback) {
  var self = this;
  var cachedData = $.totalStorage("hue.assist." + self.getTotalStorageUserPrefix()) || {};

  if (typeof cachedData[url] == "undefined" || self.hasExpired(cachedData[url].timestamp)) {
    $.ajax({
      type: "GET",
      url: url + "?" + Math.random(),
      success: function (data) {
        cachedData[url] = {
          timestamp: (new Date()).getTime(),
          data: data
        };
        $.totalStorage("hue.assist." + self.getTotalStorageUserPrefix(), cachedData);
        successCallback(data);
      },
      error: errorCallback
    });
  } else {
    successCallback(cachedData[url].data);
  }
};