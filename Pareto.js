define(["qlik", "jquery"],
function (qlik, $) {

	var app;
	var self;
	var grandTotal;
	var accumulate;
	var mapping;
	var dimFormula;
	var dimField;
	var thresholds;
	
/*******************/
	function iteratePages(self, page, pages, pageWidth, pageHeight) {
		var dataRow;
		//var finished = false;
		var percent;
		var requestPage = [{qTop: (page-1)*pageHeight, qLeft: 0, qHeight: pageHeight, qWidth: pageWidth}];
		self.backendApi.getData(requestPage).then(function(dataPage){
		
			//console.log("datapage " + page + " of " + pages + ":");
			//console.log(dataPage);
			for (var i = 0; i < dataPage[0].qMatrix.length; i++) {
    			dataRow = dataPage[0].qMatrix[i];
				
				accumulate += dataRow[1].qNum;
				percent = accumulate / grandTotal;
				//console.log(dataRow[0].qNum + " -> " + accumulate + '  %->' + percent);
				if (percent <= thresholds[0]) {
					mapping[dataRow[0].qNum - 1] = 1
				} else if (percent <= thresholds[1]) {
					mapping[dataRow[0].qNum - 1] = 2
				} else {
					mapping[dataRow[0].qNum - 1] = 3
				}
			}
			if (page < pages) {
				iteratePages(self, page + 1, pages, pageWidth, pageHeight)
			} else {
				app.variable.setStringValue('Pareto', 'Pick(' + dimFormula + ',' + mapping.join(',') + ')').then(ret => {
					console.log('Done. Updated variable "Pareto".');
				});
			}
		})
	}
/*******************/


	var qlikConfig = {
		host: window.location.hostname,
		prefix: "/",
		port: window.location.port,
		isSecure: window.location.protocol === "https:"
	};

	
	return {
		definition: { // property panel definition
			type: 'items',
			component: 'accordion',
			items: {
				dimensions: {
					uses: "dimensions"
					,min: 1
					,max: 1
				},
				measures: {
					uses: "measures"
					,min: 1
					,max: 1
				},
				sorting: {
					uses: "sorting"
				},			
				appearance: {
					uses: "settings"
				},
				mysection: {
					label: "Pareto Settings",
					type: "items",
					items: [
						{	
							label: "Threshold 1 (%)"
							,type: "number"
							,defaultValue: "50"
							,expression: "optional"
							,ref: "threshold1"
						},{	
							label: "Threshold 2 (%)"
							,type: "number"
							,defaultValue: "95"
							,expression: "optional"
							,ref: "threshold2"
						},{
							type: "string",
							ref: "buttonlabel",
							label: "Label for Button",
							expression: "optional",
							defaultValue: "Pareto"
						}
					]					
				},
				about: {label: "About", type: "items", items: [
					{label: "by Christof Schwarz", component: "text"}
					,{label: "Open on Github",component: "button", action: function(arg) {
						window.open('https://github.com/ChristofSchwarz','_blank');
					}}]
				}
			},
		},	
		support : {
			snapshot: true,
			export: true,
			exportData : false
		},
		paint: function ($element, layout) {
			var self = this; 
			var ownId = this.options.id;             
			app = qlik.currApp(this); 
			var html = '';

			//add your rendering code here
			html += '<button class="lui-button" id="Button' + ownId + '" data-cmd="Button' + ownId + '">'
			+ layout.buttonlabel + '</button>';
			$element.html(html);
			
			// Check if variable Pareto exists.
			app.variable.getByName('Pareto').then(v => {
				
			}).catch(err => {
				$element.html('Please create variable "Pareto" first.');
			});
			
			$element.find('button').on('qv-activate', function() {
//-------------------------------------------------------------------------------						
				if ($(this).data('cmd') == ('Button' + ownId)) {
//-------------------------------------------------------------------------------					
					document.getElementById("Button" + ownId).disabled = true;
					console.log(layout);
					dimFormula = layout.qHyperCube.qDimensionInfo[0].qGroupFieldDefs[0];
					dimFormula = (dimFormula.substr(0,1) == "=") ? dimFormula.substr(1) : dimFormula; // remove '=' from start
					dimField = dimFormula.split("ndex('");
					if(dimField.length<2) { 
						alert ("Fixing Dimension formula. Please retry."); 
						self.backendApi.getProperties().then(function(prop){  
							//console.log(prop);
							var dimProp = prop.qHyperCubeDef.qDimensions[0].qDef;
							var measProp = prop.qHyperCubeDef.qMeasures[0].qDef;
							//console.log (measProp);
							if(dimProp.qFieldDefs[0].substr(0,12) != "=FieldIndex(") {
								dimProp.qFieldDefs[0] = "=FieldIndex('" + dimProp.qFieldDefs[0] 
									+ "',[" + dimProp.qFieldDefs[0] + "])";
							}
							dimProp.autoSort = false; // set sort order for Dim[0]
							dimProp.qSortCriterias[0] = {  
								qSortByExpression: -1,
								qExpression: { qv: measProp.qDef },  // the measure formula is copied into sort-by-expression formula
								qSortByAscii: 0, 
								qSortByFrequency: 0,
								qSortByGreyness: 0,
								qSortByLoadOrder: 0,
								qSortByNumeric: 0,
								qSortByState: 0,
							}
							prop.qHyperCubeDef.qInterColumnSortOrder = [0,1];  // sort by Dimension, then Measure
        					self.backendApi.setProperties(prop);  
						}); 
					} else {
						dimField = dimField[1].split("'");
						dimField = dimField[0];
						thresholds = [layout.threshold1 / 100, layout.threshold2 / 100];
						app.model.enigmaModel.evaluate("FieldValueCount('" + dimField + "')").then(count => {
							console.log('Field [' + dimField + '] has ' + count + ' distinct values.');
							mapping = (',X').repeat(count).substr(1).split(',');
							grandTotal = layout.qHyperCube.qGrandTotalRow[0].qNum; 
							var pageWidth = 2; //self.backendApi.getMeasureInfos().length + self.backendApi.getDimensionInfos().length;
							var pageHeight = 5000; //Math.floor(10000/pageWidth);
							//pageHeight = 1000;
							var rows = self.backendApi.getRowCount();
							var pages = Math.ceil(rows/pageHeight);
							console.log(rows + " rows means paging through " + pages + " pages, " + pageWidth + " x " + pageHeight + " each ...");
							var page = 1;
							accumulate = 0;
							iteratePages(self, page, pages, pageWidth, pageHeight);	
						})
					}
					document.getElementById("Button" + ownId).disabled = false;
				} 
			})	
			//needed for export
			return qlik.Promise.resolve();
		}
	};

} );
