/*
  The MIT License (MIT)

  Copyright (c) 2014-2016 Ichiro Maruta

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

$(function(){
    var loadedcss = '';
    var debug = true;

    // default parameters
    if (debug) {
	$('#totaltime').val('0:06');
	$('#time1').val('0:03');
	$('#time3').val('-0:05');
    } else {
	$('#totaltime').val('25:00');
	$('#time1').val('5:00');
	$('#time3').val('-5:00');
    }
    $('#time2').val('00:00');
    $('#info').html("Click to edit this message.");

    function getHashParams() {
        var hashParams = {};
        var e,
            a = /\+/g, // Regex for replacing addition symbol with a space
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function(s) {
                return decodeURIComponent(s.replace(a, " "));
            },
            q = window.location.hash.substring(1);
        while (e = r.exec(q))
            hashParams[d(e[1])] = d(e[2]);
        return hashParams;
    }

    function parseHashParams(){
        params = getHashParams();
        if(params.tt !== undefined) $('#totaltime').val(params.tt);
        if(params.t1 !== undefined) $('#time1').val(params.t1);
	if(params.t2 !== undefined) $('#time2').val(params.t2);
	if(params.t3 !== undefined) $('#time3').val(params.t3);
	if(params.m !== undefined) $('#info').html(params.m);
	if(loadedcss !== ''){
	    location.reload();
	}
	if(params.th !== undefined && /^[a-zA-Z0-9\-]+$/.test(params.th)){
	    loadedcss=params.th;
	}else{
	    loadedcss='default';
	}
	$('head').append('<link rel="stylesheet" type="text/css" href="theme/'+loadedcss+'.css">');
    }

    function updateHash() {
        var hashstr =
	      '#tt=' + $('#totaltime').val()
	    + '&t1=' + $('#time1').val()
	    + '&t2=' + $('#time2').val()
	    + '&t3=' + $('#time3').val()
	    + '&m=' + encodeURIComponent($('#info').html());
	if(loadedcss !== 'default'){
	    hashstr = hashstr + '&th=' + encodeURIComponent(loadedcss);
	}
	$('#seturl').attr("href",hashstr);
	try{
	    history.replaceState(undefined, undefined, hashstr);
	}catch(e){
	}
    };

    $(window).on('hashchange', function() {
        parseHashParams();
	updateHash();
    });

    parseHashParams();
    updateHash();

    $('#totaltime,#time1,#time2,#time3,#info').change(function(){
	updateHash();
    });

    var infoline = $('#info').html();
    $('#info').blur(function() {
	if (infoline!=$(this).html()){
	    infoline = $(this).html();
	    updateHash();
	}
    });

    var audio_chime1,audio_chime2,audio_chime3;
    audio_chime1 = new Audio("./wav/chime1.wav");
    audio_chime2 = new Audio("./wav/chime2.wav");
    audio_chime3 = new Audio("./wav/chime3.wav");

    var basetime =  new Date('2011/1/1 00:00:00');
    var time_color;
    var neg_time = false;
    var totaltime, time1, time2, time3;
    function changeStateClass(s) {
	$('body').removeClass(function(index, className) {
	    return (className.match(/\bstate-\S+/g) || []).join(' ');
	});
	$('body').addClass('state-'+s);
    };

    var errMesg;
    function setDate(minSecStr) {
	var re = /(\-?)(\d+):(\d+)/.exec(minSecStr);

	if (re && (re[3] < 60)) {
	    var sign = re[1], h = 0, m = re[2], s = re[3];
	    /* Legintimate second value.
	       Calculating canonical h, m where m is less than 60;  */
	    m = m % 60;
	    h = parseInt(m / 60);
	    var dt;
	    dt = new Date(2011, 1, 1, h, m, s);
	    if (sign) {
		if (debug) errMesg += "Neg "+ minSecStr + " ";
		dt = basetime;
		if (debug) errMesg += "val=" + dt.getMinutes() + ":" + dt.getSeconds() + " ";
		var dtVal = dt.getTime(); // mili-second
		var negdtVal = dtVal - ((h*3600) + (m*60) + s) * 1000;
		dt = new Date(negdtVal);
		if (debug)  errMesg += "nval=" + dt.getMinutes() + ":" + dt.getSeconds() + ",";
	    } else {
		if (debug)  errMesg += minSecStr + ", ";
	    }
	    return dt;
	} else {
	    errMesg += "Format error in '"+ minSecStr + "', ";
	    // $('#info').html("Format error in '"+ minSecStr + "'");
	}
    }

    function changePhaseClass(s) {
	if (s == 0) {
	    // initialize time valuables at stdby
	    errMesg = "";
	    totaltime = setDate($('#totaltime').val());
	    time1 = setDate($('#time1').val());
	    time2 = setDate($('#time2').val());
	    time3 = setDate($('#time3').val());
	    // errMesg += basetime + " time3=" + time3;
	    if (errMesg != "") 	$('#info').html(errMesg);
	    /*
	    totaltime = new Date('2011/1/1 00:' + $('#totaltime').val());
	    time1 = new Date('2011/1/1 00:'+$('#time1').val());
	    time2 = new Date('2011/1/1 00:'+$('#time2').val());
	    time3 = new Date('2011/1/1 00:'+$('#time3').val());
	    */
	    time_color = "white";
	    neg_time = false;
	} else if (s == 1) {
	    time_color = "yellow";
	} else if (s == 2) {
	    time_color = "red";
	    neg_time = true;
	}
	$('body').removeClass(function(index, className) {
	    return (className.match(/\bphase-\S+/g) || []).join(' ');
	});
	$('body').addClass('phase-'+s);
    };

    $('.nav #standby').click(function (event){
	event.preventDefault();
	$('.navbar-nav li').removeClass('active');
	$('.navbar-nav li#standby').addClass('active');
	$('#state').html('STANDBY');
	changeStateClass('standby');
	changePhaseClass('0');
	time_inner = new Date(totaltime); 
	// $('#info').html("time_inner=" + time_inner);
	show_time();
    });
    changeStateClass('standby');
    changePhaseClass('0');

    var start_clock, zero_clock;
    var last_time;
    function setClock(){
	start_clock = new Date();
	zero_clock = new Date(start_clock + (time2 - basetime));
    }
    setClock();

    $('.nav #start').click(function (event){
	event.preventDefault();
	if($('.navbar-nav li#start').hasClass('active')){
	    return;
	}
	$('.navbar-nav li').removeClass('active');
	$('.navbar-nav li#start').addClass('active');
	$('#state').html('');
	changeStateClass('start');
	setClock();
	last_time = totaltime;
	audio_chime1.load();
	audio_chime2.load();
	audio_chime3.load();
    });

    $('.nav #pause').click(function (event){
	event.preventDefault();
	if($('.navbar-nav li#standby').hasClass('active')){
	    return;
	}

	$('.navbar-nav li').removeClass('active');
	$('.navbar-nav li#pause').addClass('active');
	update_time();
	$('#state').html('PAUSED');
	changeStateClass('paused');
    });

    $('.nav #debug').click(function (event){
	event.preventDefault();
	if($('.navbar-ctl li#debug').hasClass('active')){
	    return;
	}

	$('.navbar-ctl li').removeClass('active');
	$('.nav li#pause').addClass('active');
	changeStateClass('paused');
    });

    
    function resize_display() {
	var height=$('body').height();
	var width=$('body').width();
	var theight=Math.min(height*3/5,width*1.95/7);
	$('#time').css('top',(height-theight)/2*1.1);
	$('#time').css('font-size',theight+'px');
	$('#time').css('line-height',theight+'px');
	var sheight=theight/6;
	$('#state').css('top',height/2-theight/2-sheight/2);
	$('#state').css('font-size',sheight+'px');
	$('#state').css('line-height',sheight+'px');
	var iheight=sheight;
	$('#info').css('top',height/2+theight/2);
	$('#info').css('font-size',iheight+'px');
	$('#info').css('line-height',iheight+'px');
	$('#time').css('color', time_color);
    }
    $(window).bind("resize", resize_display);

    $('#soundcheck').click(function (event){
	event.preventDefault();
	audio_chime1.load();
	audio_chime1.currentTime = 0;
	audio_chime1.play();
    });

    function show_time(){
	var disp_time, h;
	if (neg_time) {
	    disp_time = new Date(basetime - time_inner); // get positive delta from basetime
	    // h = disp_time.getHours();
	    h = 0;
	} else {
	    disp_time = time_inner;
	    h = disp_time.getHours();
	}

        var time_str=('000' + ((h * 60) + disp_time.getMinutes()) ).slice(-3) + ':'
	    + ('00' +  disp_time.getSeconds() ).slice(-2);
        $('#time').html(time_str);
    }
    
    function update_time(){
	var cur_clock=new Date();
	time_inner=new Date(totaltime - (cur_clock - start_clock)); // count down from totaltime
	show_time();
    }

    $('[data-toggle="tooltip"]').tooltip();
    $.timer(100,function(timer){
	resize_display();
	if($('.nav li#start').hasClass('active')){
	    update_time();
	    if(time_inner <= time1 && last_time > time1){
		changePhaseClass('1');
		audio_chime1.currentTime = 0;
		audio_chime1.play();
	    } else if(time_inner <= time2 && last_time > time2){
		changePhaseClass('2');
		audio_chime2.currentTime = 0;
		audio_chime2.play();
		$('#info').html(last_time + " time3=" + time3);
	    } else if(time_inner <= time3 && last_time > time3){
		changePhaseClass('3');
		audio_chime3.currentTime = 0;
		audio_chime3.play();
	    }
	    last_time=time_inner;
	}
    })
});
