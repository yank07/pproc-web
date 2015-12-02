var map;

function get_facetQuery(){
  loading(true);
  var checks = $("input[name='facets']:checked");
	var values = [];
	for(var k = 0; k < checks.length; k++){
		values.push(checks[k].value);
	}
	var input_object = {};
	values.forEach(function(e){
		input_object[e] = getFacet(e);
	});
  var input = JSON.stringify(input_object); 
  var uri ="http://155.210.104.11:8080/pproc-ws/facetQuery";
  $.ajax({
    type: "POST",
    url: uri,
    contentType: "application/json; charset=utf-8",
    crossDomain: true,
    data: input,
    dataType: "json",
    async: true,
    success: function(output) {
      console.log('call to facetQuery success');
      try {
        setToItems(output);
        setupTable();
      } catch ( err ) {
        console.log (err);
        $("#detail").empty();
        $("#detail").append(JSON.stringify(output));
      }
      loading(false);
    }
  });
}

function loading (siOno) {

  if(siOno) {
    $('#loadimg').css('display','inline');
    $("#fQuery").button('disable');
    var dynatable = $('#my-final-table').data('dynatable');
    dynatable.settings.dataset.originalRecords = null;
    dynatable.process();
  } else {
    $('#loadimg').css('display','none');
    $("#fQuery").button('enable');
  }
}

function setupTable() {
  $('#my-final-table tr').each( function( index, el ) {
    if(index!=0) {
      $( el ).css('cursor', 'pointer');
      var contractUri = $( el ).children( "td:first-child" ).text();
      var sparqlEndpoint = $( el ).children( "td:nth-child(2)" ).text();
      $( el ).on("click", 
        {
          contractUri: contractUri,
          sparqlEndpoint: sparqlEndpoint
        }, get_contractQuery);
    }
  });
  $('#my-final-table td').css('text-align','left');
}

function get_contractQuery(event){
  var input = JSON.stringify(event.data);
  console.log(input);
  var uri ="http://155.210.104.11:8080/pproc-ws/contractQuery";
  $.ajax({
    type: "POST",
    url: uri,
    contentType: "application/json; charset=utf-8",
    crossDomain: true,
    data: input,
    dataType: "json",
    async: true,
    success: function(output) {
      console.log('call to contractQuery success');
      var frame = { "@type" : "http://contsem.unizar.es/def/sector-publico/pproc#Contract" };
      jsonld.frame(output, frame, function(err, framed) {
        var contract = framed['@graph'][0];
        if ( contract != null ) {
          $("#detail").empty();
          printPprocElementRecursive(contract, 0);
        } else {
          console.log('Error from call to contractQuery, no contract found');
          $("#detail").empty();
          $("#detail").append(JSON.stringify(output));
        }
      });
    }
  });
}

function printPprocElementRecursive(root, margin) {
  var el;
  if ( root != null ) {
    $.each(root, function(key, value) {
      switch ( $.type(value) ) {
        case 'string':
          printString(key, value, margin, false);
          break;
        case 'number':
        case 'boolean':
          printString(key, value, margin, true);
          break;
        case 'array':
          if ( $.type(value[0]) == 'object' ) {
            for ( var i = 0; i < value.length; i++ ) {
              $("#detail").append($('<h4>').text(getName(key)).css('margin-left', margin));
              printPprocElementRecursive(value[i], margin + 20);
            }
          } else {
            $("#detail").append($('<h4>').text(getName(key)).css('margin-left', margin));
            printStringArray(value, margin + 20);
          }
          break;
        case 'object':
          if ( Object.keys(value).length == 1 ) {
            if ( root['@id'] != null ) {
              printString(key, getName(root['@id']), margin, false);
            } else if ( root['@type'] != null ) {
              printString(key, getName(root['@type']), margin, false);
            } else if ( root['@value'] != null ) {
              printString(key, getName(root['@value']), margin, false);
            } else {
              console.log('ERROR - objeto de una propiedad no @id/@type/@value');
            }
          } else {
            $("#detail").append($('<h4>').text(getName(key)).css('margin-left', margin));
            // console.log('value');
            // console.log(value);
            printPprocElementRecursive(value, margin + 20);
          }
          break;
        default:
          console.log('ERROR - tipo no esperado');
          console.log(key);
          console.log(value);
          console.log(typeof value);
      }
    });
  }
}

function getName(input) {
  if ( input == "@id" ) {
    return "Id";
  }
  if ( input == "@value" ) {
    return "Valor";
  }
  if ( input == "@type" ) {
    return "Tipo";
  }
  var label = input;
  $.each(window.map, function(key, value) {
    if (key=='<' + input + '>') {
      label = value;
    }
  });
  return label;
}

function printStringArray ( array, margin ) { 
  var toPrint = '<ul style="margin-left:' + margin + 'px;">'
  for( var i = 0; i < array.length; i++ ) {
    toPrint = toPrint + '<li>' + getName(array[i]) + '</li>';
  }
  toPrint = toPrint + '</ul>';
  $("#detail").append(toPrint);
}

function printString ( prop, string, margin, booleano ) {  
  var toPrint = '<p style="margin-left:' + margin + 'px;"><b>' + getName(prop) + '</b> - ';
  if ( booleano ) {
    toPrint = toPrint + (getName(string) == '1' ? 'Cierto' : 'Falso');
  } else {
    toPrint = toPrint + getName(string);
  }
  toPrint = toPrint + '</p>';
  $("#detail").append(toPrint);
}

function getValue(element) {
  if ( element['@value'] != null ) {
    return element['@value'];
  } else {
    return element;
  }
}

function getId(element) {
    if ( element['@id'] != null ) {
    return element['@id'];
  } else {
    return element;
  }
}

function numberWithCommas(x) {
  var output = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return output;
}

function getFacet(facet){
	textualFacets = ["object_text","object_cpv","contractingAuthority","supplier_text","supplier_cif"];
	selectionFacets = ["tenderState","procedureType"];
	doubleFacets = ["budget"];
	dateFacets = ["tenderStartDate","tenderNoticeDate","tenderDeadline","awardDate","formalizedDate"];

	if(textualFacets.indexOf(facet) >= 0){
		return $("#"+facet).val();
	} else if(selectionFacets.indexOf(facet) >= 0){
		return $("select#" + facet + " option:selected").val();
	} else if(doubleFacets.indexOf(facet) >= 0){
		return $("#"+facet+"_min").val() + " " + $("#"+facet+"_max").val();
	} else if(dateFacets.indexOf(facet) >= 0){
		return $("#"+facet+"_min").val().split('/').reverse().join('-') + " " + $("#"+facet+"_max").val().split('/').reverse().join('-');
	}
}

function setToItems (argument) {
  var dynatable = $('#my-final-table').data('dynatable');
  dynatable.settings.dataset.originalRecords = argument;
  dynatable.process();
}

$(function(){

	$("#fQuery").button().on("click", function(){
		get_facetQuery();
	});

	$(".select_list").selectmenu();

	$(".data_ticker").datepicker({
		dateFormat: "dd/mm/yy",
		dayNames: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sabado"],
		dayNamesMin: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
		monthNames: [ "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" ]
	});

	$("span.facet_value input").val("");
	$("input[name='facets']").prop("checked", false);
  
  $('#my-final-table').dynatable({
    features: {
      paginate: true,
      search: true,
      recordCount: true,
      perPageSelect: true
    }
  }).bind('dynatable:afterProcess', setupTable);
  
  $('input[value="procedureType"]').prop('checked', true);
  
  $.getJSON("http://contsem.unizar.es/docs/pprocLabelMap.json", function (data) {
    window.map = data;
  });
  
});














