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
   2. At amber time, bell-1 rings. Clock face becomes amber.
   3. At red time (aka. time=00:00), bell-2 rings. Clock face becomes red.
      'OVER TIME' message displayed. Timer is then count up.
   4. At end time, bell-3 rings, Clock face becomes purple.
   5. The color is defined in theme/default.css, which can be changed by parameter.
   6. Three digit for minute. Maximum duration is '999 minute 59 second=999:59'
   7. Value can be given http arguments or input form at navigation bar.
   8. Illegal time is checked and error meesage is shown in message line.
   9. Using nav-pills for a pull down menu of all three bell checking
   10. Mute, Debug button works, use button highlight to show its active state
*/

/*
 ****  Basic algorithm ***
Virtual time counter relative to baseTime:
   baseTime is 2011/2/1 0:0:0  // Note: Date(2011,0,1,...)

   totalTime  = 2011/2/1 0:totalTime
   time1Amb   = 2011/2/1 0:time1 (amber bell)
   time2Red   = 2011/2/1 0:time2 (red bell)
   time3End   = 2011/2/1 0:time3 (end bell)

Current Timer:
   timeInner = virtual time relative from baseTime.

   timeInner is compared to time1Amb, time2Red, time3End for
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
    var defaultTheme = 'funny';
    // var defaultTheme = 'default';
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
	    loadedcss=defaultTheme;
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

    var baseTime =  new Date('2011/2/1 00:00:00');
    var negTime = false;
    var totalTime, time1Amb, time2, time3;
    var phaseMessage = '';
    function changeStateClass(s) {
	if (s == 'standby') {        // standby
	    $('#state').html('STANDBY');
	} else if (s == 'start') {        // standby
	    $('#state').html(phaseMessage);
	} else if (s == 'paused') {        //  paused
	    $('#state').html('PAUSED');
	}
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
	    var dt = new Date(2011, 1, 1, h, m, s); // date = 2011/2/1
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
	}
    }

    function changePhaseClass(s) {
	var m = $('body').data('phaseMsg'); // need camel case
	$('#info').html(m);
	if (s == '0') { // phase0 - start
	    // initialize time valuables at stdby
	    errMesg = "";
	    phaseMessage = '';
	    totalTime = setDate($('#totalTime').val());
	    time1Amb = setDate($('#time1').val());
	    time2Red = setDate($('#time2').val());
	    time3End = setDate($('#time3').val());
	    // if (errMesg != "") 	$('#info').html(errMesg);
	    negTime = false;
	    // m = $('body').data('phaseMsg'); // need camel case
	    // m = $('body').data('phase-msg');
	    // m = $('.phase-0').data('phase-msg');
	    // m = 'hoge';
	    // m = 'ほげ';
	} else if (s == '1') { // phase1 - Amber
	    phaseMessage = '';
	} else if (s == '2') { // phase2 - Red
	    negTime = true;
	    phaseMessage = 'OVER TIME';
	} else if (s == '3') { // phase2 - End
	    phaseMessage = 'OVER TIME';
	}
	$('#state').html(phaseMessage);
	$('body').removeClass(function(index, className) {
	    return (className.match(/\bphase-\S+/g) || []).join(' ');
	});
	$('body').addClass('phase-'+s);
    };

    $('.nav #standby').click(function (event){
	event.preventDefault();
	$('.navbar-nav li').removeClass('active');
	$('.navbar-nav li#standby').addClass('active');
	changePhaseClass('0');
	changeStateClass('standby');
	timeInner = new Date(totalTime); 
	// $('#info').html("timeInner=" + timeInner);
	show_time();
    });
    changePhaseClass('0');
    changeStateClass('standby');

    var startClock, lastTime;
    function setClock(){
	startClock = new Date();
	// zeroClock = new Date(startClock + (time2Red - baseTime)); // Unused
    }
    setClock();

    $('.nav #start').click(function (event){
	event.preventDefault();
	if($('.navbar-nav li#start').hasClass('active')){
	    return;
	}
	$('.navbar-nav li').removeClass('active');
	$('.navbar-nav li#start').addClass('active');
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
	if($('.navbar-nav li#pause').hasClass('active')){
	    return;
	}
	$('.navbar-nav li').removeClass('active');
	$('.navbar-nav li#pause').addClass('active');
	update_time();
	totalTime = timeInner;
	changeStateClass('paused');
    });

    $('.nav #debug').click(function (event){
	event.preventDefault();
	if( $('.nav #debug').hasClass('active')){
	    $('.nav #debug').removeClass('active');
	    $('#state').html('Debug Off');
	    debug = false;
	} else {
	    $('#state').html('Debug On');
	    debug = true;
	    $('.nav #debug').addClass('active');
	}
    });
    
    $('.nav #mute').click(function (event){
	event.preventDefault();
	if($('.nav li#mute').hasClass('active')){
	    $('.nav li#mute').removeClass('active');
	    $('.nav li#mute').removeClass('focus');
	    $('#state').html('Sound On');
	    mute = false;
	} else {
	    $('#state').html('Mute');
	    mute = true;
	    $('.nav li#mute').addClass('active');
	    $('.nav li#mute').addClass('focus');
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
	// $('#time').css('color', time_color); // color changes by css loaded by param.th or loadedcss
    }
    $(window).bind("resize", resize_display);

    $('.nav #bell1check').click(function (event){
	event.preventDefault();
	if (mute) return;
	audio_chime1.load();
	audio_chime1.currentTime = 0;
	audio_chime1.play();
    });

    $('.nav #bell2check').click(function (event){
	event.preventDefault();
	if (mute) return;
	audio_chime2.load();
	audio_chime2.currentTime = 0;
	audio_chime2.play();
    });

    $('.nav #bell3check').click(function (event){
	event.preventDefault();
	if (mute) return;
	audio_chime3.load();
	audio_chime3.currentTime = 0;
	audio_chime3.play();
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
	    if(timeInner <= time1Amb && lastTime > time1Amb){
		changePhaseClass('1');
		if (!mute) {
		    audio_chime1.currentTime = 0;
		    audio_chime1.play();
		}
	    } else if(timeInner <= time2Red && lastTime > time2Red){ // time gets zero
		changePhaseClass('2');
		if (!mute) {
		    audio_chime2.currentTime = 0;
		    audio_chime2.play();
		}
		if (debug) $('#info').html(lastTime + " time3=" + time3End);
	    } else if(timeInner <= time3End && lastTime > time3End){
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
