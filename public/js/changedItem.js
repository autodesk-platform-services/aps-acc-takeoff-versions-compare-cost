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

/// Note: there are some field id used in the following code:
/// pcc3750bf : Dimensions -> Area, 
/// p153cb174 : __name__ -> name
/// p20d8441e: __category__ -> _RC
/// p30db51f9: __category__ -> _RFN
/// p13b6b3a0: __category__ -> _RFT


class ChangedItem {

  constructor() {
    this._items = []
    this.priceBook = new PriceBook();
    // this._view = null
    this.columns = [
      { field: 'name', title: "Name", align: 'center' },
      { field: 'before', title: "Current", align: 'center' },
      { field: 'after', title: "Latest", align: 'center' },
      { field: 'amount', title: "Quantity", align: 'center' },
      { field: 'cost', title: "Cost($)", align: 'center' },
      { field: 'svf2Id', title: "Svf2Id", align: 'center' }
    ]
  }

  // async reset() {

  //   if (this._view)
  //     this._view.rows().clear().draw()
  //   this._items = []

  // }

  // //display a few properties 
  // async initViewHeader() {
  // }

  async produceView(items) {

    this._items = items
    var itemsForShow = []
    await this.priceBook.initPriceBook();
    var totalCostChange = 0;
    items.forEach(async e => {
      const wallUnitPrice = this.priceBook.getPriceInfoForElement('Wall');
      const windowUnitPrice = this.priceBook.getPriceInfoForElement('Window');

      let prevValue = 0;
      let curValue = 0;
      let amount = 0;
      let cost = 0;
      let amountStr = '';

      let elementType = null;
      let elementName = null;

      if( e.type == "OBJECT_REMOVED" ){
        elementType = e.prev.props['p20d8441e'];
        elementName = e.prev.props.p153cb174;
      }else{
        elementType = e.props['p20d8441e'];
        elementName = e.props.p153cb174;
      }
      switch (elementType) {
        case "Windows":
          prevValue = e.prev.props != null ? 1 : 0;
          curValue = e.props != null ? 1 : 0;
          amount = curValue - prevValue;
          amountStr = amount +'('+windowUnitPrice.Unit+')',
          cost = accounting.toFixed( (curValue - prevValue)*windowUnitPrice.Price, 2);
          break;

        case "Walls":
          prevValue = e.prev.props != null ? accounting.toFixed(e.prev.props['pcc3750bf'], 2) : 0;
          curValue = e.props != null ? accounting.toFixed(e.props['pcc3750bf'], 2) : 0;
          amount = accounting.toFixed(curValue - prevValue, 2);
          amountStr = amount +'('+wallUnitPrice.Unit+')',
          cost = accounting.toFixed( (curValue - prevValue)*wallUnitPrice.Price, 2);
          break;

        default:
          break;
      }

      totalCostChange += (curValue - prevValue)*wallUnitPrice.Price;

      //check if properties or geometries are changed
      var oneItem = {
        name: elementName,
        before: prevValue,
        after: curValue,
        amount: amountStr,
        cost: cost,
        svf2Id: e.svf2Id
      }
      itemsForShow.push(oneItem)
    });

    // Add the final total cost estimation
    itemsForShow.push({
      name: "",
      before: "",
      after: "",
      amount: "",
      cost: accounting.toFixed(totalCostChange, 2),
      svf2Id: ""
    })

    $(`#changedItem`).bootstrapTable('destroy');
    $(`#changedItem`).bootstrapTable({
      parent: this,
      data: itemsForShow,
      editable: false,
      clickToSelect: true,
      cache: false,
      showToggle: false,
      showPaginationSwitch: false,
      pagination: false,
      pageList: [5, 10, 25, 50, 100],
      pageSize: 5,
      pageNumber: 1,
      paginationParts: [],
      uniqueId: 'id',
      striped: true,
      search: false,
      showRefresh: false,
      minimumCountColumns: 2,
      smartDisplay: true,
      columns: this.columns,
      onClickRow: function (row, element, field) {
        const svf2Id = row.svf2Id
        apsViewer_left.clearThemingColors(apsViewer_left.model);
        apsViewer_left.showAll()
        apsViewer_right.clearThemingColors(apsViewer_right.model);
        apsViewer_right.showAll()

        if( row.after != 0 ){
          apsViewer_right.setThemingColor(svf2Id, new THREE.Vector4(0, 0, 1, 1))
          apsViewer_left.setThemingColor(svf2Id, new THREE.Vector4(0, 0, 1, 1))
  
          apsViewer_right.isolate(svf2Id)
          apsViewer_left.isolate(svf2Id)
  
          apsViewer_right.fitToView(svf2Id)
          apsViewer_left.fitToView(svf2Id)
        }else{
          apsViewer_left.setThemingColor(row.svf2Id, new THREE.Vector4(1, 0, 0, 1))   

          //zooming to the element by bounding-box 
          const selectedItem = global_ChangedItem._items.find(i => i.svf2Id == row.svf2Id)
          if (selectedItem && selectedItem.prev.bboxMax) {
               var fragbBox = new THREE.Box3();   
              fragbBox.max.x = selectedItem.prev.bboxMax.x - apsViewer_right.model.getGlobalOffset().x
              fragbBox.max.y = selectedItem.prev.bboxMax.y - apsViewer_right.model.getGlobalOffset().y
              fragbBox.max.z = selectedItem.prev.bboxMax.z - apsViewer_right.model.getGlobalOffset().z
              fragbBox.min.x = selectedItem.prev.bboxMin.x - apsViewer_right.model.getGlobalOffset().x
              fragbBox.min.y = selectedItem.prev.bboxMin.y - apsViewer_right.model.getGlobalOffset().y
              fragbBox.min.z = selectedItem.prev.bboxMin.z - apsViewer_right.model.getGlobalOffset().z
              var fragbBox = getBoundingBoxByViewerAPI(apsViewer_left, row.svf2Id)
              fragbBox.expandByScalar(3) 
              apsViewer_left.navigation.fitBounds(true, fragbBox)
              apsViewer_right.navigation.fitBounds(true, fragbBox)
          }else{
            apsViewer_left.isolate(row.svf2Id)
          }
        }
      }
    });

  }
}