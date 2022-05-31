/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
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
'use strict';   

const { createTreeNode, apiClientCallAsync } = require('./apiclient');
var config = require('../../config'); 

const base64url = require('base64url');

///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
async function getPackages( projectId, token, res){
    const packagesUrl =  config.url.takeoff.PACKAGES_URL.format(projectId);
    let packagesRes = null;
    try {
        packagesRes = await apiClientCallAsync('GET', packagesUrl, token.access_token);
    } catch (err) {
      console.error(err)
    }

    res.json(packagesRes.body.results.map((item) => {
        return createTreeNode(
            projectId+'/packages/'+ item.id,
            "Package: " + item.name,
            "packages",
            null,
            true
        );
    }));
}



///////////////////////////////////////////////////////////////////////
///
///
async function getTakeoffContents(projectId, packageId, token, res) {
    const takeoffContentsUrl = config.url.takeoff.TAKEOFF_CONTENTS_URL.format(projectId);
    const takeoffItemsUrl = config.url.takeoff.TAKEOFF_ITEMS_URL.format(projectId, packageId);
    var contentsRes = null;
    let takeoffItemsRes = null;
    try {
        contentsRes = await apiClientCallAsync('GET', takeoffContentsUrl, token.access_token);
        takeoffItemsRes = await apiClientCallAsync('GET', takeoffItemsUrl, token.access_token);
        const files = await Promise.all(contentsRes.body.results.map(async (contentItem) => {
            if (contentItem.type == 'FILE_MODEL') {
                const itemTipUrl = config.url.dm.DM_GET_ITEM_TIP.format(projectId, contentItem.view.lineageUrn);
                const itemTipRes = await apiClientCallAsync('GET', itemTipUrl, token.access_token);
                // set the content name to the file name
                contentItem.view.viewName = itemTipRes.body.data.attributes.name;
                contentItem.tipVersion = itemTipRes.body.data.id;

                // check if the current version of the takeoff items
                const theItem = takeoffItemsRes.body.results.find((takeoffItem) => takeoffItem.contentView.id === contentItem.id)
                contentItem.versionInPack = theItem ? theItem.contentView.version : itemTipRes.body.data.id;
                const params = contentItem.versionInPack.split('version=');
                contentItem.view.viewName = itemTipRes.body.data.attributes.name + " - v" + params[params.length - 1];
            }
            return contentItem;
        }))

        const treeNodes = files.map((item) => {

            if (item.type == 'FILE_MODEL') {
                if (item.tipVersion == null || item.versionInPack == null) {
                    console.log("Failed to get the tip or current version for the 3D model.")
                    return null;
                }
                const itemId = item.versionInPack + '/' + item.tipVersion + '/' + projectId + '/packages/' + packageId + '/contents/' + item.id;
                return createTreeNode(
                    itemId,
                    item.view.viewName,
                    item.versionInPack && item.tipVersion && item.tipVersion != item.versionInPack ? "contentsalert" : "contents3d",
                    null,
                    !!item.versionInPack
                );
            } else {
                return createTreeNode(
                    projectId + '/packages/' + packageId + '/contents/' + item.id,
                    item.view.sheetName,
                    "contents",
                    null,
                    true
                );
            }
        });
        res.json(treeNodes.filter(node => node !== null));
    } catch (err) {
        console.error(err)
    }


}


///////////////////////////////////////////////////////////////////////
///
///
async function getTakeoffTypes(projectId, packageId, token, res){
    const takeoffTypesUrl =  config.url.takeoff.TAKEOFF_TYPES_URL.format(projectId, packageId);
    var typesRes = null;
    try {
        typesRes = await apiClientCallAsync('GET', takeoffTypesUrl, token.access_token);
    } catch (err) {
      console.error(err)
    }

    res.json(typesRes.body.results.map((item) => {
        return createTreeNode(
            projectId+'/packages/'+ packageId+'/types/'+item.id,
            item.name,
            "types",
            null,
            true
        );
    }));

}


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
async function getTakeoffItems( projectId, packageId, contentId, token, res){    
    const takeoffItemsUrl =  config.url.takeoff.TAKEOFF_ITEMS_URL.format(projectId, packageId);
    let takeoffItemsRes = null;
    try {
        takeoffItemsRes = await apiClientCallAsync('GET', takeoffItemsUrl, token.access_token);
    } catch (err) {
      console.error(err)
    }

    let treeNodes = takeoffItemsRes.body.results.map((item) => {
        if( item.contentView.id != contentId ){
            return null;
        }
        return createTreeNode(
            base64url(item.contentView.version)+'.'+item.id+'.'+item.objectId,
            item.objectName? item.objectName : item.type,
            "takeoffitems",
            null,
            false
        );
    });
    res.json(treeNodes.filter(node => node !== null));
}

module.exports = {
    getPackages,
    getTakeoffTypes,
    getTakeoffContents,
    getTakeoffItems
}