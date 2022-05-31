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

const express = require('express');
const IndexAPI = require('./common/index-api');
const utility = require("./utility")
const index_data = require("./index-data")
const { OAuth } = require('./common/oauthImp');

var bodyParser = require('body-parser');
let router = express.Router();

/// Note: there are some field id used in the following code:
/// pcc3750bf : Dimensions -> Area, 
/// p153cb174 : __name__ -> name
/// p20d8441e: __category__ -> _RC
/// p30db51f9: __category__ -> _RFN
/// p13b6b3a0: __category__ -> _RFT


///////////////////////////////////////////////////////////////////////
/// Middleware for obtaining a token for each request.
///////////////////////////////////////////////////////////////////////
router.use(async (req, res, next) => {

    const oauth = new OAuth(req.session);
    if (!oauth.isAuthorized()) {
        console.log('no valid authorization!')
        res.status(401).end('Please login first')
        return
    }
    req.oauth_client = oauth.getClient();
    req.oauth_token = await oauth.getInternalToken();
    next();
});


//post indexing of diff
router.post('/index/:project_id/:isDiff', async (req, res) => {
    const project_id = req.params['project_id']
    const isDiff = req.params['isDiff']
    const payload = req.body
    res.status(202).end();

    try {
        var result = await IndexAPI.postIndexBatchStatus(project_id, JSON.stringify(payload), isDiff, req.oauth_token.access_token)
        if (result == null) {
            console.log('post index failed: ')
            utility.socketNotify(utility.SocketEnum.INDEX_TOPIC,
                utility.SocketEnum.ERROR,
                { error: 'post index failed: ' })
            return
        }

        //because now we use batchStatus, and only one pair of diff, so get first item result[0]
        const index_id = isDiff ? result.diffs[0].diffId : result.indexes[0].indexId
        var state = isDiff ? result.diffs[0].state : result.indexes[0].state
        while (state != 'FINISHED') {
            //keep polling
            result = await IndexAPI.getIndex(project_id, index_id, isDiff, req.oauth_token.access_token)
            state = result.body.state
        }

        // Create a query to only check type of Door, Floor, Wall, Window,  
        const queryPayload = {
            "query": {
                "$or": [
                    { "$eq": ["s.props.p20d8441e", "'Walls'"] },
                    { "$eq": ["s.props.p20d8441e", "'Windows'"] },
                    { "$eq": ["s.props.p20d8441e", "'Doors'"] },
                    { "$eq": ["s.props.p20d8441e", "'Floors'"] },
                    { "$eq": ["s.prev.props.p20d8441e", "'Walls'"] },
                    { "$eq": ["s.prev.props.p20d8441e", "'Windows'"] },
                    { "$eq": ["s.prev.props.p20d8441e", "'Doors'"] },
                    { "$eq": ["s.prev.props.p20d8441e", "'Floors'"] }
                ]
            },
        }
        let queryRes = await IndexAPI.postQuery(project_id, index_id, JSON.stringify(queryPayload), isDiff, req.oauth_token.access_token);
        if (queryRes == null) {
            console.log('post index failed: ')
            utility.socketNotify(utility.SocketEnum.INDEX_TOPIC,
                utility.SocketEnum.ERROR,
                { error: 'post index failed: ' })
            return
        }

        const query_id = queryRes.queryId;
        let queryStatus = queryRes.state;
        while (queryStatus != 'FINISHED') {
            //keep polling
            queryRes = await IndexAPI.getQuery(project_id, index_id, query_id, isDiff, req.oauth_token.access_token)
            queryStatus = queryRes.body.state
        }

        //start to download data
        const { fields, manifest, queries } = await index_data.downloadIndexData(project_id, index_id, query_id, isDiff, req.oauth_token.access_token)

        //notify to client
        utility.socketNotify(utility.SocketEnum.INDEX_TOPIC, {
            message: utility.SocketEnum.INDEX_DONE,
            properties: queries,
            fields: fields,
            manifest: manifest
        })
    } catch (e) {
        // here goes out error handler
        console.log('post index failed: ' + e.message)
        utility.socketNotify(utility.SocketEnum.INDEX_TOPIC,
            utility.SocketEnum.ERROR,
            { error: e.message })
    }
});

module.exports = router;
