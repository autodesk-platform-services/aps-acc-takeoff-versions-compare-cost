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

/// Note: there are some field id used in the following code:
/// pcc3750bf : Dimensions -> Area, 
/// p153cb174 : __name__ -> name
/// p20d8441e: __category__ -> _RC
/// p30db51f9: __category__ -> _RFN
/// p13b6b3a0: __category__ -> _RFT


class TableView {
    constructor(tableId, elementType ) {
        this.elementType = elementType;
        this.tableId = tableId;
        this.itemsForShow = null;
        this.clickHandler = this.clickHandler.bind(this);
        this.columns = [
            { field: 'name', title: "Name", align: 'center' },
            { field: 'svf2Id', title: "Svf2Id", align: 'center' }
        ]
    }


    clickHandler(e, row) {
        //when one item of table view is clicked.
        //highlight this element
        forgeViewer_right.clearThemingColors(forgeViewer_right.model);
        forgeViewer_right.showAll()
        forgeViewer_left.clearThemingColors(forgeViewer_left.model);
        forgeViewer_left.showAll()

        if( this.elementType == ElementType.CHANGED ){
            forgeViewer_right.setThemingColor(row.svf2Id, new THREE.Vector4(0, 0, 1, 1))
            forgeViewer_left.setThemingColor(row.svf2Id, new THREE.Vector4(0, 0, 1, 1))
            forgeViewer_right.isolate(row.svf2Id)
            forgeViewer_left.isolate(row.svf2Id)
            forgeViewer_right.fitToView(row.svf2Id)
            forgeViewer_left.fitToView(row.svf2Id)
        }else{
            const viewerWithoutElement = this.elementType==ElementType.ADDED ?forgeViewer_left:forgeViewer_right;
            const viewerWithElement    = this.elementType==ElementType.ADDED ?forgeViewer_right:forgeViewer_left;
            viewerWithElement.setThemingColor(row.svf2Id, this.elementType == ElementType.ADDED ? new THREE.Vector4(0, 1, 0, 1) : new THREE.Vector4(1, 0, 0, 1));
            //zooming to the element by bounding-box 
            const selectedItem = this.itemsForShow.find(i => i.svf2Id == row.svf2Id);
            if (selectedItem) {
                var fragbBox = new THREE.Box3();
                fragbBox.max.x = selectedItem.bboxMax.x - viewerWithoutElement.model.getGlobalOffset().x;
                fragbBox.max.y = selectedItem.bboxMax.y - viewerWithoutElement.model.getGlobalOffset().y;
                fragbBox.max.z = selectedItem.bboxMax.z - viewerWithoutElement.model.getGlobalOffset().z;
                fragbBox.min.x = selectedItem.bboxMin.x - viewerWithoutElement.model.getGlobalOffset().x;
                fragbBox.min.y = selectedItem.bboxMin.y - viewerWithoutElement.model.getGlobalOffset().y;
                fragbBox.min.z = selectedItem.bboxMin.z - viewerWithoutElement.model.getGlobalOffset().z;
                var fragbBox = getBoundingBoxByViewerAPI(viewerWithElement, row.svf2Id);
                fragbBox.expandByScalar(3);
                viewerWithoutElement.navigation.fitBounds(true, fragbBox);
                viewerWithElement.navigation.fitBounds(true, fragbBox);
            }
        }
    }

    //update the table with new data
    async produceView(items) {
        this.itemsForShow = items.map( item => {
            return {
                name: item.props?item.props.p153cb174:item.prev.props.p153cb174,
                svf2Id: item.svf2Id,
                bboxMax: item.bboxMax?item.bboxMax:item.prev.bboxMax,
                bboxMin: item.bboxMin?item.bboxMin:item.prev.bboxMin
            }
        } )
        $(this.tableId).bootstrapTable('destroy');
        $(this.tableId).bootstrapTable({
            data: this.itemsForShow,
            height: '150',
            striped: true,
            search: false,
            columns: this.columns
        });
        $(this.tableId).on('click-row.bs.table', this.clickHandler)
    }
}
