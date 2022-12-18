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

var apsViewer = null;
var apsViewer_left = null;
var apsViewer_right = null;

var objectIds = [];

var VIEWER_ITEM = {
  MAIN_VIEWER: 0,
  LEFT_VIEWER:1,
  RIGHT_VIEWER:2
}



function initViewer(viewerItem) {

  if( viewerItem == VIEWER_ITEM.MAIN_VIEWER && apsViewer!= null
    ||  viewerItem == VIEWER_ITEM.LEFT_VIEWER && apsViewer_left!= null
    || viewerItem == VIEWER_ITEM.RIGHT_VIEWER && apsViewer_right!= null )
    return;

  var options = {
    env: 'AutodeskProduction2',
    api: 'streamingV2',
    getAccessToken
  };
  let def = $.Deferred();

  Autodesk.Viewing.Initializer(options, function onInitialized() {

    switch (viewerItem) {
      case VIEWER_ITEM.MAIN_VIEWER: {
          apsViewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('apsViewer'));
          apsViewer.start();
        break;
      }
      case VIEWER_ITEM.LEFT_VIEWER: {
          apsViewer_left = new Autodesk.Viewing.GuiViewer3D(document.getElementById('apsViewer_left'));
          apsViewer_left.start();
        break;

      }
      case VIEWER_ITEM.RIGHT_VIEWER: {
          apsViewer_right = new Autodesk.Viewing.GuiViewer3D(document.getElementById('apsViewer_right'));
          apsViewer_right.start();
        break;
      }
    }
    def.resolve();
  })

  return def.promise();
}





function launchViewer(viewer, urn, object_id = null) {
  objectIds = [];
  if (object_id)
    objectIds.push(object_id);

  var documentId = 'urn:' + urn;
  Autodesk.Viewing.Document.load(documentId,onDocumentLoadSuccess, onDocumentLoadFailure);

  function onDocumentLoadSuccess(doc) {
    var viewables = doc.getRoot().getDefaultGeometry();
    viewer.loadDocumentNode(doc, viewables).then(async (model) => {
      // Highlight the takeoff element after geometry is loaded
      await Autodesk.Viewing.EventUtils.waitUntilGeometryLoaded(viewer);
      if (objectIds.length > 0) {
        viewer.isolate(objectIds);
        viewer.fitToView(objectIds);
      }
    });
  }

  function onDocumentLoadFailure(viewerErrorCode) {
    console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
  }
}


async function getAccessToken(callback) {
  const resp = await fetch('/api/aps/oauth/token');
  if (resp.ok) {
    const { access_token, expires_in } = await resp.json();
    callback(access_token, expires_in);
  } else {
    alert('Could not obtain access token. See the console for more details.');
    console.error(await resp.text());
  }
}



function getBoundingBoxByViewerAPI(viewer, svf2Id) {
  var fragIds = []
  viewer.model.getInstanceTree().enumNodeFragments(svf2Id, i => fragIds.push(i))
  //fragments list array
  var fragList = viewer.model.getFragmentList();
  const fragbBox = new THREE.Box3()
  const nodebBox = new THREE.Box3()

  fragIds.forEach(function (fragId) {
    fragList.getWorldBounds(fragId, fragbBox)
    nodebBox.union(fragbBox)
  })
  return nodebBox
}