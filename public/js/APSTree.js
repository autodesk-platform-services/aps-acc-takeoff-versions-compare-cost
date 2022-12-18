/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Autodesk Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

const ElementType = {
  ADDED: 0,
  REMODED: 1,
  CHANGED: 2,
  OTHER: 99
};

const global_AddedView   = new TableView('#addedView', ElementType.ADDED)
const global_ChangedView = new TableView('#changedView', ElementType.CHANGED)
const global_RemovedView = new TableView('#removedView', ElementType.REMODED)
const global_ChangedItem = new ChangedItem()


$(document).ready(function () {
  // first, check if current visitor is signed in
  jQuery.ajax({
    url: '/api/aps/oauth/token',
    success: function (res) {
      // yes, it is signed in...
      $('#autodeskSignOutButton').show();
      $('#autodeskSigninButton').hide();

      $('#refreshSourceHubs').show();

      // prepare sign out
      $('#autodeskSignOutButton').click(function () {
        $('#hiddenFrame').on('load', function (event) {
          location.href = '/api/aps/oauth/signout';
        });
        $('#hiddenFrame').attr('src', 'https://accounts.autodesk.com/Authentication/LogOut');
      })

      // and refresh button
      $('#refreshSourceHubs').click(function () {
        $('#sourceHubs').jstree(true).refresh();
      });

      prepareUserHubsTree();
      showUser();
    },
    error: function (err) {
      $('#autodeskSignOutButton').hide();
      $('#autodeskSigninButton').show();
    }
  });

  $('#autodeskSigninButton').click(function () {
    jQuery.ajax({
      url: '/api/aps/oauth/url',
      success: function (url) {
        location.href = url;
      }
    });
  })


  $.getJSON("/api/aps/oauth/clientid", function (res) {
    $("#ClientID").val(res.id);
    $("#provisionAccountSave").click(function () {
      $('#provisionAccountModal').modal('toggle');
      $('#sourceHubs').jstree(true).refresh();
    });
  });

});



function prepareUserHubsTree() {
  $('#sourceHubs').jstree({
    'core': {
      'themes': { "icons": true },
      'multiple': false,
      'data': {
        "url": '/api/aps/datamanagement',
        "dataType": "json",
        'cache': false,
        'data': function (node) {
          $('#sourceHubs').jstree(true).toggle_node(node);
          return { "id": node.id };
        }
      }
    },
    'types': {
      'default': { 'icon': 'glyphicon glyphicon-question-sign' },
      '#': { 'icon': 'glyphicon glyphicon-user' },
      'hubs': { 'icon': 'https://cdn.autodesk.io/dm/xs/a360hub.png' },
      'personalHub': { 'icon': 'https://cdn.autodesk.io/dm/xs/a360hub.png' },
      'bim360Hubs': { 'icon': 'https://cdn.autodesk.io/dm/xs/bim360hub.png' },
      'accprojects': { 'icon': './img/accproject.svg'},
      'bim360projects': { 'icon': './img/bim360project.png' },
      'a360projects': { 'icon': 'https://cdn.autodesk.io/dm/xs/a360project.png' },
      'packages': { 'icon': 'glyphicon glyphicon-briefcase' },
      'contentsalert': { 'icon': './img/newversion.png' },
      'contents': { 'icon': 'glyphicon glyphicon-file' },
      'contents3d': { 'icon': './img/R-C.png' },
      'takeoffitems': { 'icon': 'glyphicon glyphicon-tasks' },
      'takeoffitemalert': { 'icon': 'glyphicon glyphicon-alert' },
      'bim360documents': { 'icon': 'glyphicon glyphicon-file' },
      'unsupported': { 'icon': 'glyphicon glyphicon-ban-circle' }
    },
    "sort": function (a, b) {
      var a1 = this.get_node(a);
      var b1 = this.get_node(b);
      var parent = this.get_node(a1.parent);
      if (parent.type === 'items') { // sort by version number
        var id1 = Number.parseInt(a1.text.substring(a1.text.indexOf('v') + 1, a1.text.indexOf(':')))
        var id2 = Number.parseInt(b1.text.substring(b1.text.indexOf('v') + 1, b1.text.indexOf(':')));
        return id1 > id2 ? 1 : -1;
      }
      else if (a1.type !== b1.type) return a1.icon < b1.icon ? 1 : -1; // types are different inside folder, so sort by icon (files/folders)
      else return a1.text > b1.text ? 1 : -1; // basic name/text sort
    },
    // "plugins": ["types", "state", "sort"],
    "plugins": ["types", "state", "sort", "contextmenu"],
    contextmenu: { items: autodeskMenuSource },
    "state": { "key": "sourceHubs" }// key restore tree state
  }).on("select_node.jstree", async function (evt, data) {
    if (data != null && data.node != null && (data.node.type == 'packages')) {
      const instanceTree = $('#sourceHubs').jstree(true);
      for (const parentNode in data.node.parents) {
        const currentNode = instanceTree.get_node(data.node.parents[parentNode]);
        if (currentNode.type === "accprojects") {
          $('#labelProjectHref').text(currentNode.id);
          $('#labelCostContainer').text(currentNode.original.cost_container);
          break;
        }
      }
      // caculate the package cost
      if (costMgrInstance != null) {
        $('.clsInProgress').show();
        $('.clsResult').hide();
        await costMgrInstance.refreshPackageCost(data.node.id);
        $('.clsInProgress').hide();
        $('.clsResult').show();
      }
    }
    if (data != null && data.node != null && (data.node.type == 'takeoffitems' || data.node.type == 'takeoffitemalert')) {
      let params = data.node.id.split('.');

      if (params[params.length - 1] != 'null') {
        $('#diffAPSViewersContent').hide();
        $('#apsViewerContent').show();
        await initViewer(VIEWER_ITEM.MAIN_VIEWER)
        launchViewer(apsViewer, params[0], parseInt(params[params.length - 1]));
      }
      else {
        alert("This takeoff item is connected to a 2D Sheet, not support to be viewed currently!")
      }
    }

    if (data != null && data.node != null && (data.node.type == 'contents3d' || data.node.type == 'contentsalert')) {
      let params = data.node.id.split('/');

      $('#diffAPSViewersContent').hide();
      $('#apsViewerContent').show();
      const urn = btoa(params[0]).replace("/", "_");
      await initViewer(VIEWER_ITEM.MAIN_VIEWER)
      launchViewer(apsViewer, urn);
    }
    if (data != null && data.node != null && data.node.type == 'contents') {
      alert("2D Sheet is not supported to be viewed currently, only 3D Model is supported!")
    }

  });
}

async function showDiff(node) {
  if (node == null) {
    console.log('selected node is not correct.');
    return;
  }

  $('#diffAPSViewersContent').show();
  $('#apsViewerContent').hide();

  $('.diffInProgress').show();
  $('.diffResult').hide();

  const params = node.id.split('/');
  if (params.length !== 7) {
    alert("The selected node is not correct.");
    console.log('the node id is not correct');
    return;
  }

  const requestUrl = '/api/aps/index/' + params[params.length - 5] + '/true';
  const requestBody = {
    diffs: [
      {
        prevVersionUrn: params[params.length - 7],
        curVersionUrn: params[params.length - 6]
      }
    ]
  };

  let versionParams = params[params.length - 6].split('version=');
  const latestVersion = versionParams[versionParams.length - 1];
  versionParams = params[params.length - 7].split('version=');
  const curVersion = versionParams[versionParams.length - 1];

  $('#leftLabel')[0].textContent = "Version: " + curVersion;
  $('#rightLabel')[0].textContent = "Version: " + latestVersion;

  const preUrn = btoa(params[params.length - 7]).replace("/", "_");
  const curUrn = btoa(params[params.length - 6]).replace("/", "_");

  // let fileInfo = new FileDiffInfo(params[params.length - 7], params[params.length - 6], null);

  // global_fileDiffInfoListMgr.addFileInfo(fileInfo);

  await initViewer(VIEWER_ITEM.LEFT_VIEWER);
  await initViewer(VIEWER_ITEM.RIGHT_VIEWER)

  launchViewer(apsViewer_left, preUrn);
  launchViewer(apsViewer_right, curUrn);


  // $('#fileNameLabel')[0].textContent = node.text + "| current version:" + curVersion + ", latest version:" + latestVersion;

  try {
    const result = await apiClientAsync(requestUrl, requestBody, 'post');
    return true;
  } catch (err) {
    console.error('Failed to index the diff');
    // $('.diffInProgress').hide();
    // $('.diffResult').show();
    return false;
  }
}


function autodeskMenuSource(autodeskNode) {
  var items;

  switch (autodeskNode.type) {
    case "contentsalert":
      items = {
        showDiff: {
          label: "Check all changes from the latest version",
          action: function () {
            showDiff(autodeskNode);
          },
          icon: 'glyphicon glyphicon-alert'
        }
      };
      break;
  }
  return items;
}



function showUser() {
  jQuery.ajax({
    url: '/api/aps/user/profile',
    success: function (profile) {
      var img = '<img src="' + profile.picture + '" height="20px">';
      $('#userInfo').html(img + profile.name);
    }
  });
}