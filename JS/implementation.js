var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

var lastClicked = -1;   //nazadnje izbran element iz menija dodajanja oseb
var firstClick = true;  //uporabljeno za menjavo prikazanih komponent, ko se prvič pridobi podatke osebe

var bmiWarning=0;
var bpWarning=0;
var fever=0;

var visina=0;

var countryDataJson;
var countryDataJsonBP;

//setterji, ker znotraj poizvedbe ne moreš spreminjati globalnih
function setBMIwarning(warVal){
    bmiWarning=warVal;
}
function setBPwarning(warVal){
    bpWarning=warVal;
}
function setFever(warVal){
    fever=warVal;
}
function setVisina(warVal){
    visina=warVal;
}
function setCountryData(data){
    countryDataJson = data;
}
function setCountryDataBP(data){
    countryDataJsonBP = data;
}

//getterji
function getBMIwarning(){
    return bmiWarning;
}
function getBPwarning(){
    return bpWarning;
}
function getFever(){
    return fever;
}
function getVisina(){
    return visina;
}
function getCountryData(){
    return countryDataJson;
}
function getCountryDataBP(){
    return countryDataJsonBP;
}

function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}

function vrniOsebo(idOsebe) { //za naše potrebe so podatki vnešeni tu. v končni verziji bi aplikacija zahtevala uporabniški račun in prijavo, podatki pa bi bili že naloženi v EHR scape. Klic osebe(0) vrne število oseb (da jih je lažje dodajati).
    var osebe = [
        0,
        {ime:"Ana", priimek:"Živec", datumRojstva:"1973-02-06T15:23", visina:168, teza:69.5, temperatura:36.5, sisTlak:145, diaTlak:92, datumMeritve:"2014-12-16T14:05"},
        {ime:"Boris", priimek:"Novak", datumRojstva:"1989-05-12T06:15", visina:182.4, teza:87, temperatura:37.6, sisTlak:119, diaTlak:79, datumMeritve:"2014-12-15T16:36"},
        {ime:"Cveta", priimek:"Velikonja", datumRojstva:"1978-11-03T19:47", visina:171.4, teza:92.3, temperatura:36.5, sisTlak:131, diaTlak:86, datumMeritve:"2014-12-17T11:41"}
    ];
    osebe[0] = osebe.length-1;
    return osebe[idOsebe];
}

function nastaviOsebo(idOsebe) {    //dropdown genercije
    var oseba = vrniOsebo(idOsebe);
    lastClicked = idOsebe;
    $("#poljeIzbireOsebe").val(oseba.ime+" "+oseba.priimek);
}

function generirajOsebo() {         //gumb generiraj
    var oseba = vrniOsebo(lastClicked);
    kreirajOsebo(oseba);
}

function nastaviEHRosebe(ehrId) {   //dropdown poizvedbe
    $("#poljePoizvedbeEHR").val(ehrId);
}

function kreirajOsebo(oseba) {
    if(lastClicked!=-1){
        $.ajaxSetup({
            headers: {
                    "Ehr-Session": getSessionId()
                }
            });
            $.ajax({
                url: baseUrl + "/ehr",
                type: 'POST',
                success: function (data) {
                    var ehrId = data.ehrId;
                    
                    // build party data
                    var partyData = {
                        firstNames: oseba.ime,
                        lastNames: oseba.priimek,
                        dateOfBirth: oseba.datumRojstva,
                        partyAdditionalInfo: [ {
                            key: "ehrId",
                            value: ehrId
                        } ]
                    };
                    $.ajax({
                        url: baseUrl + "/demographics/party",
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify(partyData),
                        success: function (party) {
                            if (party.action == 'CREATE') {
                                $("#meniDodanihOseb").append("<li><a href='javascript:nastaviEHRosebe(&quot;"+ehrId+"&quot;);'>"+oseba.ime+" "+oseba.priimek+"</a></li>");
                                dodajPodatke(ehrId, oseba);
                            }
                        },
                        error: function (napaka){
                            window.alert(JSON.parse("Prišlo je do napake: "+napaka.responseText).userMessage);
                        }
                    });
                }
            });
    }
}

function dodajPodatke(ehrId, oseba){
    $.ajaxSetup({
        headers: {
            "Ehr-Session": getSessionId()
        }
    });
    var compositionData = {
        "ctx/time": oseba.datumMeritve,
        "ctx/language": "en",
        "ctx/territory": "SI",
        "vital_signs/body_temperature/any_event/temperature|magnitude": oseba.temperatura,
        "vital_signs/body_temperature/any_event/temperature|unit": "°C",
        "vital_signs/blood_pressure/any_event/systolic": oseba.sisTlak,
        "vital_signs/blood_pressure/any_event/diastolic": oseba.diaTlak,
        "vital_signs/height_length/any_event/body_height_length": oseba.visina,
        "vital_signs/body_weight/any_event/body_weight": oseba.teza,
        "vital_signs/body_mass_index/any_event/body_mass_index|magnitude": oseba.bmi,
        "vital_signs/body_mass_index/any_event/body_mass_index|unit":"kg/m2"
    };
    var queryParams = {
        "ehrId": ehrId,
        templateId: 'Vital Signs',
        format: 'FLAT',
        committer: 'some_doctor'
    };
    $.ajax({
        url: baseUrl + "/composition?" + $.param(queryParams),
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(compositionData),
        success: function (data) {
            
        },
        error: function (napaka) {
            window.alert(JSON.parse("Prišlo je do napake: "+napaka.responseText).userMessage);
        }
    });
}

function dodajPodatkeUser(){
    $.ajaxSetup({
        headers: {
            "Ehr-Session": getSessionId()
        }
    });
    var compositionData = {
        "ctx/time": $("#userDatum").val(),
        "ctx/language": "en",
        "ctx/territory": "SI",
        "vital_signs/body_weight/any_event/body_weight": $("#userTeza").val(),
    };
    var queryParams = {
        "ehrId": $("#osebniEHR").val(),
        templateId: 'Vital Signs',
        format: 'FLAT',
        committer: 'user-'+$("#osebniEHR").val(),
    };
    $.ajax({
        url: baseUrl + "/composition?" + $.param(queryParams),
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(compositionData),
        success: function (data) {
            $("#confirmAddCol").html('<div class="alert alert-success alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>Meritev uspešno dodana.</div>')
        },
        error: function (napaka) {
            window.alert(JSON.parse("Prišlo je do napake: "+napaka.responseText).userMessage);
        }
    });
}

function poizvedbaAQL(){
    var AQL = 
		"select " +
    		"a/data[at0002]/events[at0003]/time/value as measure_time, " +
    		"a/data[at0002]/events[at0003]/data[at0001]/items[at0004, 'Body weight']/value as Body_weight, " +
		"from EHR e[e/ehr_id/value='" + $("#osebniEHR").val() + "'] " +
		"contains COMPOSITION a" +
		"contains OBSERVATION a[openEHR-EHR-OBSERVATION.body_weight.v1] " +
		"limit 10";
    $.ajaxSetup({
        headers: {
            "Ehr-Session": getSessionId()
        }
    });
    $.ajax({
		url: baseUrl + "/query?" + $.param({"aql": AQL}),
		type: 'GET',
		success: function (data) {
		    alert("We're in");
		   	if (data.length > 0) {
		   	    for (var i in data.resultSet){
		    	    $("#meritveList").append('<a class="list-group-item">'+data.resultSet[i].measure_time+': '+data.resultSet[i].Body_weight+'kg</a>');
		   	    }
		   	} else {
		   		window.alert("Meritve morate dodati preden jih lahko preglejujete.");
		  	}
		},
		error: function (napaka) {
                window.alert(JSON.parse("Prišlo je do napake: "+napaka.responseText).userMessage);
        }
	});
}

function poizvedba() {
    var ehrId = $("#poljePoizvedbeEHR").val();
    if(ehrId != ""){
        if(firstClick){
            $("#placeholderBody").attr("hidden","");
            $("#dataBody").removeAttr("hidden");
            firstClick=false;
        }
        $.ajaxSetup({
            headers: {
                "Ehr-Session": getSessionId()
            }
        });
        $.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
	    	type: 'GET',
	    	success: function(data) {
	    	    var party = data.party;
	    	    $("#osebniEHR").val(ehrId);
	    	    $("#osebniIme").val(party.firstNames);
	    	    $("#osebniPriimek").val(party.lastNames);
	    	    $("#osebniDatumRojstva").val(party.dateOfBirth);
	    	    
	    	    $.ajax({
        			url: baseUrl + "/view/" + ehrId + "/height",
        	    	type: 'GET',
        	    	success: function(podatki) {
        	    	    $("#vitalniVisina").val(podatki[0].height+"cm");
        	    	    setVisina(podatki[0].height);
        	    	    
        	    	    $.ajax({
                			url: baseUrl + "/view/" + ehrId + "/weight",
                	    	type: 'GET',
                	    	success: function(podatki) {
                	    	    $("#vitalniTeza").val(podatki[0].weight+"kg");
                	    	    
                	    	    var teza=parseFloat(podatki[0].weight);
                	    	    var visina=getVisina();
                                var BMI = Number((10000*(teza/Math.pow(visina,2))).toFixed(1));
                                $("#vitalniBMI").val(BMI); //izračun BMI
                                if(BMI<18.5){
                                    setBMIwarning(-1);
                                } else if(BMI<25) {
                                    setBMIwarning(0);
                                } else if(BMI<30) {
                                    setBMIwarning(1);
                                } else {
                                    setBMIwarning(2);
                                }
                                
                                $.ajax({
                        			url: baseUrl + "/view/" + ehrId + "/body_temperature",
                        	    	type: 'GET',
                        	    	success: function(podatki) {
                        	    	    var temperatura = podatki[0].temperature;
                        	    	    $("#vitalniTemperatura").val(temperatura+podatki[0].unit);
                        	    	    $("#vitalniDatum").val(podatki[0].time);
                        	    	    if (temperatura > 37.5) {
                        	    	        setFever(2);
                        	    	    } else if (temperatura > 36.5) {
                        	    	        setFever(1);
                        	    	    } else {
                        	    	        setFever(0);
                        	    	    }
                        	    	    
                        	    	    $.ajax({
                                			url: baseUrl + "/view/" + ehrId + "/blood_pressure",
                                	    	type: 'GET',
                                	    	success: function(podatki) {
                                	    	    var bpSyst = podatki[0].systolic;
                                	    	    var bpDias = podatki[0].diastolic;
                                	    	    $("#vitalniSist").val(bpSyst+"mm[Hg]");
                                	    	    $("#vitalniDiast").val(bpDias+"mm[Hg]");
                                	    	    if (bpSyst<90 || bpDias<60){
                                	    	        setBPwarning(-1);
                                	    	    } else if(bpSyst>139 || bpDias>89) {
                                	    	        setBPwarning(2);
                                	    	    } else if(bpSyst>119 || bpDias>79) {
                                	    	        setBPwarning(1);
                                	    	    } else {
                                	    	        setBPwarning(0);
                                	    	    }
                                	    	    generirajOpozorila();
                                	    	}
                                        });
                        	    	}
                                });
                	    	}
                        });
        	    	},
        	    	error: function (napaka) {
                        window.alert(JSON.parse("Prišlo je do napake: "+napaka.responseText).userMessage);
                    }
                });
	    	},
	    	error: function (napaka) {
                window.alert(JSON.parse("Prišlo je do napake: "+napaka.responseText).userMessage);
            }
        }); 
    }
}

function generirajOpozorila(){
    var seznam=$("#opozorila");
    seznam.empty();
    //bpWarning, bmiWarning, fever
    var bmiWarning1 = getBMIwarning();
    var bpWarning1 = getBPwarning();
    var fever1 = getFever();
    
    if(bpWarning1 === 0 && bmiWarning1 === 0 && fever1 === 0){
        seznam.append('<li class="list-group-item list-group-item-success">Vaše meritve ne kažejo na zdravstvene težave.</li>');
    } else {
        if(bmiWarning1 == -1){
            seznam.append('<li class="list-group-item list-group-item-warning">Vaše meritve kažejo na podhranjenost. Prosimo, posvetujte se s svojim osebnim zdravnikom. </li>');
        } else if (bmiWarning1 == 1) {
            seznam.append('<li class="list-group-item list-group-item-warning">Vaše meritve kažejo na povišano telesno težo. Svetujemo, da si ogledate <a href="/ois-dn4/pages/bw.html">našo stran o samopomoči</a>.</li>');
        } else if (bmiWarning1 == 2) {
            seznam.append('<li class="list-group-item list-group-item-danger">Vaše meritve kažejo na močno povišano telesno težo. Prosimo, da se polek ogleda <a href="/ois-dn4/pages/bw.html">naše strani o samopomoči</a> še posvetujete s svojim osebnim zdravnikom.</li>');
        }
        if (bmiWarning1>0 && fever1>0) {
            seznam.append('<li class="list-group-item list-group-item-warning">Ker vaše meritve kažejo na povišano telesno temperaturo, se pred začetkom kakršnekoli vadbe se posvetujte s svojim osebnim zdravnikom.</li>');
        }
        if (fever1==1) {
            seznam.append('<li class="list-group-item list-group-item-warning">Vaše meritve kažejo na mogočo povišano telesno temperaturo. Če meritev presega vašo običajno temperaturo se posvetujte s svojim osebnim zdravnikom.');
        } else if (fever1 == 2) {
            seznam.append('<li class="list-group-item list-group-item-danger">Vaše meritve kažejo na povišano telesno temperaturo. Prosimo, posvetujte se s svojim osebnim zdravnikom.');
        }
        if (bpWarning1 == -1) {
            seznam.append('<li class="list-group-item list-group-item-warning">Vaše meritve kažejo na prenizek krvni pritisk. Prosimo, posvetujte se s svojim osebnim zdravnikom.');
        } else if (bpWarning1 == 1) {
            seznam.append('<li class="list-group-item list-group-item-warning">Vaše meritve kažejo na povišan krvni pritisk. Svetujemo, da si ogledate <a href="/ois-dn4/pages/bp.html">našo stran o samopomoči</a>.</li>');
        } else if (bpWarning1 == 2) {
            seznam.append('<li class="list-group-item list-group-item-danger">Vaše meritve kažejo na močno povišan krvni pritisk. Prosimo, da se polek ogleda <a href="/ois-dn4/pages/bp.html">naše strani o samopomoči</a> še posvetujete s svojim osebnim zdravnikom.</li>');
        }
    }
}

function helpAlert(){
    window.alert('Izberite osebo iz menija "Ime" v oknu "Generiraj osebo" in pritisnite "Generiraj" da prenesete njene podatke na EHRscape. Potem jih lahko v oknu "Prenos podatkov" od tam naložite za pregled.');
}

function grabWHOdata(){
    $.ajax({
        url: "http://apps.who.int/gho/athena/api/GHO/WHOSIS_000010.json?profile=simple",
        dataType: 'jsonp',
        success: function (countryData) {
            setCountryData(countryData);
            for(var i=0; i<(countryData.fact.length)/3-11; i++){
                $("#countryList").append('<a class="list-group-item" href="javascript:countryClick(&quot;'+countryData.fact[i].COUNTRY+'&quot;);">'+countryData.fact[i].COUNTRY+'</a>');
            }
        }
    });
    $.ajax({
        url: "http://apps.who.int/gho/athena/api/GHO/BP_02.json?profile=simple",
        dataType: 'jsonp',
        success: function (countryDataBP) {
            setCountryDataBP(countryDataBP);
        }
    });
}

function countryClick(country){
    $("#detailList").empty();
    $("#detailList").append('<a class="list-group-item" href="javascript:filterDetailsBMI(&quot;'+country+'&quot;);">Odstotek ljudi nad 20, ki so predebeli</a>');
    $("#detailList").append('<a class="list-group-item" href="javascript:filterDetailsBP(&quot;'+country+'&quot;);">Odstotek ljudi nad 20, ki imajo previsok krvni tlak</a>');
}

function filterDetailsBMI(country){
    $.each(getCountryData().fact, function(i, el) {
        if (el.COUNTRY == country) {
            if (el.SEX == "Male") {
                $("#maleResults").html('<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">Moški</h3></div><div class="panel-body">'+el.Value+'</div></div>');
            }
            if (el.SEX == "Female") {
                $("#femaleResults").html('<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">Ženske</h3></div><div class="panel-body">'+el.Value+'</div></div>');
            }
        }
    });
}

function filterDetailsBP(country){
    $.each(getCountryDataBP().fact, function(i, el) {
        if (el.COUNTRY == country) {
            if (el.SEX == "Male") {
                $("#maleResults").html('<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">Moški</h3></div><div class="panel-body">'+el.Value+'</div></div>');
            }
            if (el.SEX == "Female") {
                $("#femaleResults").html('<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">Ženske</h3></div><div class="panel-body">'+el.Value+'</div></div>');
            }
        }
    });
}

$(document).ready(function() {
    for (var i=1; i<=vrniOsebo(0); i++) {   //sestavi seznam oseb
        var oseba = vrniOsebo(i);
        $( "#meniOseb" ).append( "<li><a href='javascript:nastaviOsebo("+i+");'>"+oseba.ime+" "+oseba.priimek+"</a></li>" );
    }
    grabWHOdata();
});