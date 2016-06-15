/*
  The MIT License (MIT)

  Copyright (c) 2014-2016 Ichiro Maruta
  Copyright (c) 2016 Satoshi Matsushita

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

/*
  An Presentation Timer with Bells by Satoshi Matsushita on June 15, 2016
  
  Features:
   1. Count down timer: starting with 'totalTime'.
   2. At amber time, bell-1 ringed. Clock face becomes amber.
   3. At red time (aka. time=00:00), bell-2 ringed. Clock face becomes red.
      'OVER TIME' message displayed. Timer is then count up.
   4. Three digit for minute. Maximum duration is '999 minute 59 second=999:59'
   5. Value can be given http arguments or input form at navigation bar.
   6. Illegal time is checked and error meesage is shown in message line.
   7. End bell is not working yet..

*/

/*
 ****  Basic algorithm ***
Virtual time counter relative to baseTime:
   baseTime is 2011/1/1 0:0:0

   totalTime  = 2011/1/1 0:totalTime
   time1      = 2011/1/1 0:time1 (amber bell)
   time2      = 2011/1/1 0:time2 (red bell)
   time3      = 2011/1/1 0:time3 (end bell)

Current Timer:
   timeInner = virtual time relative from baseTime.

   timeInner is compared to time1, time2, time3 for
      bell, message, or state change.

At Events:
Start)
 - set startClock = Date();
 　　
Timer Update) 
 - Triggered by a helper function $.timer()

 - Updating timeInner as follows, which is a key:
  curClock = Date(); // current realtime clock
  timeInner=new Date(totalTime - (curClock - startClock));

For Display:
 if (negTime == true) {
 　  dispTime = new Date(baseTime - timeInner); 
　} else {
     dispTime = timeInner;
 }
 Then merging hours to minutes for minutes greater than 59 min.

pause)
 totalTime = timeInner; // set restarting time

*/

$(function(){
    var loadedcss = '';
    var debug = true;
    var mute = false;

    // default parameters
    if (debug) {
	$('#totalTime').val('0:06');
	$('#time1').val('0:03');
	$('#time3').val('-0:05');
    } else {
	$('#totalTime').val('25:00');
	$('#time1').val('5:00');
	$('#time3').val('-5:00');
    }
    $('#time2').val('00:00');
    $('#info').html("Click to edit this message.");

    debug = false;

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
        if(params.tt !== undefined) $('#totalTime').val(params.tt);
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
	      '#tt=' + $('#totalTime').val()
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

    $('#totalTime,#time1,#time2,#time3,#info').change(function(){
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

    var baseTime =  new Date('2011/1/1 00:00:00');
    var time_color;
    var negTime = false;
    var totalTime, time1, time2, time3;
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
	    var sign = re[1], h, m = re[2], s = re[3];
	    /* Legintimate second value.
	       Calculating canonical h, m where m is less than 60;  */
	    h = parseInt(m / 60);
	    m = m % 60;
	    var dt = new Date(2011, 1, 1, h, m, s);
	    if (sign) {
		if (debug) errMesg += "Neg "+ minSecStr + " ";
		dt = baseTime;
		if (debug) errMesg += "val=" + dt.getMinutes() + ":" + dt.getSeconds() + " ";
		var dtVal = dt.getTime(); // mili-second
		var negdtVal = dtVal - ((h*3600) + (m*60) + s) * 1000;
		dt = new Date(negdtVal);
		if (debug)  errMesg += "nval=" + dt.getMinutes() + ":" + dt.getSeconds() + ",";
	    } else {
		if (debug)  errMesg += minSecStr + " h=" +  h + ", ";
	    }
	    return dt;
	} else {
	    errMesg += "Format error in '"+ minSecStr + "', ";
	    // $('#info').html("Format error in '"+ minSecStr + "'");
	}
    }

    function changePhaseClass(s) {
	if (s == 0) { // start
	    // initialize time valuables at stdby
	    errMesg = "";
	    totalTime = setDate($('#totalTime').val());
	    time1 = setDate($('#time1').val());
	    time2 = setDate($('#time2').val());
	    time3 = setDate($('#time3').val());
	    // errMesg += baseTime + " time3=" + time3;
	    if (errMesg != "") 	$('#info').html(errMesg);
	    /*
	    Totaltime = new Date('2011/1/1 00:' + $('#totalTime').val());
	    time1 = new Date('2011/1/1 00:'+$('#time1').val());
	    time2 = new Date('2011/1/1 00:'+$('#time2').val());
	    time3 = new Date('2011/1/1 00:'+$('#time3').val());
	    */
	    time_color = "white";
	    negTime = false;
	    $('#state').html('');
	} else if (s == 1) { // warning
	    time_color = "yellow";
	} else if (s == 2) { // timeout
	    time_color = "red";
	    negTime = true;
	    $('#state').html('OVER TIME');
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
	timeInner = new Date(totalTime); 
	// $('#info').html("timeInner=" + timeInner);
	show_time();
    });
    changeStateClass('standby');
    changePhaseClass('0');

    var startClock, lastTime;
    function setClock(){
	startClock = new Date();
	// zeroClock = new Date(startClock + (time2 - baseTime));
    }
    setClock();

    $('.nav #start').click(function (event){
	event.preventDefault();
	if($('.navbar-nav li#start').hasClass('active')){
	    return;
	}
	$('.navbar-nav li').removeClass('active');
	$('.navbar-nav li#start').addClass('active');
	if (negTime == true)
	    $('#state').html('OVER TIME');
	else
	    $('#state').html('');
	changeStateClass('start');
	setClock();
	lastTime = totalTime;
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
	totalTime = timeInner;
	$('#state').html('PAUSED');
	changeStateClass('paused');
    });

    $('.nav #debug').click(function (event){
	event.preventDefault();
	if($('.navbar-ctl li#debug').hasClass('active')){
	    $('.navbar-ctl li#debug').removeClass('active');
	    $('.navbar-ctl li#debug').removeClass('focus');
	    $('#state').html('Debug Off');
	    debug = false;
	} else {
	    $('#state').html('Debug On');
	    debug = true;
	    $('.navbar-ctl li#debug').addClass('active');
	    $('.navbar-ctl li#debug').addClass('focus');
	}
    });
    
    $('.nav #mute').click(function (event){
	event.preventDefault();
	if($('.navbar-ctl li#mute').hasClass('active')){
	    $('.navbar-ctl li#mute').removeClass('active');
	    $('#state').html('Sound On');
	    mute = false;
	} else {
	    $('#state').html('Mute');
	    mute = true;
	    $('.navbar-ctl li#mute').addClass('active');
	    $('.navbar-ctl li#mute').addClass('focus');
	}
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
	if (mute) return;
	audio_chime1.load();
	audio_chime1.currentTime = 0;
	audio_chime1.play();
    });

    function show_time(){
	var dispTime, h, m;
	if (negTime) {
	    dispTime = new Date(baseTime - timeInner); // get positive delta from baseTime
	    // h = dispTime.getHours();
	    h = 0;
	} else {
	    dispTime = timeInner;
	    h = dispTime.getHours();
	}
	m = (h * 60) + dispTime.getMinutes();
	var timeStr;
	if (m >= 100) {
	    timeStr = ('000' + m).slice(-3);
	} else {
	    timeStr = '&nbsp;' + ('00'+ m).slice(-2);
	}
        timeStr += ':' + ('00' +  dispTime.getSeconds() ).slice(-2);
        $('#time').html(timeStr);
    }
    
    function update_time(){
	var curClock=new Date();
	timeInner=new Date(totalTime - (curClock - startClock)); // count down from totalTime
	show_time();
    }

    $('[data-toggle="tooltip"]').tooltip();
    $.timer(100,function(timer){
	resize_display();
	if($('.nav li#start').hasClass('active')){
	    update_time();
	    if(timeInner <= time1 && lastTime > time1){
		changePhaseClass('1');
		if (!mute) {
		    audio_chime1.currentTime = 0;
		    audio_chime1.play();
		}
	    } else if(timeInner <= time2 && lastTime > time2){ // time gets zero
		changePhaseClass('2');
		if (!mute) {
		    audio_chime2.currentTime = 0;
		    audio_chime2.play();
		}
		if (debug) $('#info').html(lastTime + " time3=" + time3);
	    } else if(timeInner <= time3 && lastTime > time3){
		changePhaseClass('3');
		if (!mute) {
		    audio_chime3.currentTime = 0;
		    audio_chime3.play();
		}
	    }
	    lastTime = timeInner;
	}
    })
});
