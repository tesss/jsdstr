﻿(function () {
    Date.prototype.format = function (format) //author: meizz
    {
        var o = {
            "M+": this.getMonth() + 1, //month
            "d+": this.getDate(),    //day
            "h+": this.getHours(),   //hour
            "m+": this.getMinutes(), //minute
            "s+": this.getSeconds(), //second
            "q+": Math.floor((this.getMonth() + 3) / 3),  //quarter
            "S": this.getMilliseconds() //millisecond
        };

        if (/(y+)/.test(format))
            format = format.replace(RegExp.$1,
                (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(format))
                format = format.replace(RegExp.$1,
                    RegExp.$1.length == 1 ? o[k] :
                        ("00" + o[k]).substr(("" + o[k]).length));
        return format;
    };

    var helpers = {
        returnUrlParameter: "ReturnUrl",
        defaultReturnUrl: "/",
        pwdMinLength: 5,

        getUrlParameterByName: function (name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        },

        returnBack: function () {
            var returnUrl = helpers.getUrlParameterByName(helpers.returnUrlParameter);
            if (returnUrl != "")
                window.location = returnUrl;
            else
                window.location = helpers.defaultReturnUrl;
        },

        parseDate: function (jsonDate) {
            return new Date(parseInt(jsonDate.substr(6)));
        }
    };

    var validation = {
        isEmail: function (email) {
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        }
    };

    var ui = {
        errorClass: 'has-error',
        dateTimeFormat: "dd.MM.yyyy hh:mm:ss",

        addError: function (source, msg) {
            if (source != '')
                source += '</br>';
            return source + msg;
        },

        setAlertState: function ($alert, msg, cssClass) {
            if ($alert != null && msg != '') {
                var classToAdd = 'alert';
                if (typeof cssClass == "string") {
                    classToAdd += ' ' + cssClass;
                }
                else if (typeof cssClass == "boolean" && cssClass) {
                    classToAdd += ' alert-success';
                } else if (typeof cssClass == "boolean") {
                    classToAdd += ' alert-danger';
                }
                $alert.attr('class', '').addClass(classToAdd);
                $alert.html(msg);
                $alert.removeClass('hide');
            }
        },

        setButtonState: function ($btn, cssClass, title, state, dataState) {
            if ($btn != null) {
                if (state != null)
                    $btn.button(state);
                if (cssClass != null)
                    $btn.attr('class', '').addClass('btn').addClass(cssClass);
                if (title != null)
                    $btn.html(title);
                if (dataState != null)
                    $btn.data('state', dataState);
            }
        }
    };

    var resources = {};

    var Processing = function () {
        var handlers = {
            beforeCreateSession: $.Callbacks(),
            beforeCancelSession: $.Callbacks(),

            failMaxAttemptsCreateSession: $.Callbacks(),
            failMaxAttemptsPingSession: $.Callbacks(),
            failMaxAttemptsCalculationSession: $.Callbacks(),

            successCreateSession: $.Callbacks(),
            failCreateSession: $.Callbacks(),

            successPingSession: $.Callbacks(),
            failPingSession: $.Callbacks(),

            successCancelSession: $.Callbacks(),
            failCancelSession: $.Callbacks(),

            successCompleteSession: $.Callbacks(),
            failCompleteSession: $.Callbacks(),

            failSessionClientNull: $.Callbacks(),
            failSessionServerNull: $.Callbacks(),
            failSessionInvalidState: $.Callbacks(),

            failSessionCalculation: $.Callbacks()
        };

        var currentSession;

        var checkCurrentSession = function () {
            if (!$.isPlainObject(currentSession)) {
                handlers.failSessionClientNull.fire();
                return false;
            }
            return true;
        };

        var checkSession = function (session, stateShouldBe) {
            if (!$.isPlainObject(session)) {
                handlers.failSessionServerNull.fire();
                return false;
            }
            else if (stateShouldBe != null && session.State != stateShouldBe) {
                handlers.failSessionInvalidState.fire(session);
                return false;
            }
            return true;
        };

        var calculation = function (data) {
            var sum = 0;
            for (var i = 0; i <= 10000000000; i++) {
                sum += i;
            }
            return sum;
        };

        var worker;

        var maxSessionAttempts = 5;
        var createSessionAttempts = 0;
        var pingSessionAttempts = 0;
        var calculationSessionAttempts = 0;

        var startAgainSessionTimeout = 1500;

        var checkCreateSessionMaxAttempts = function () {
            if (createSessionAttempts >= maxSessionAttempts) {
                handlers.failMaxAttemptsCreateSession.fire(maxSessionAttempts);
                createSessionAttempts = 0;
                return false;
            }
            return true;
        };

        var checkPingSessionMaxAttempts = function () {
            if (pingSessionAttempts >= maxSessionAttempts) {
                timerStarted = false;
                if (worker != null)
                    worker.close();
                handlers.failMaxAttemptsPingSession.fire(maxSessionAttempts);
                pingSessionAttempts = 0;
                return false;
            }
            return true;
        };

        var checkCalculateSessionMaxAttempts = function () {
            if (calculationSessionAttempts >= maxSessionAttempts) {
                if (worker != null)
                    worker.close();
                handlers.failMaxAttemptsCalculationSession.fire(maxSessionAttempts);
                calculationSessionAttempts = 0;
                return false;
            }
            return true;
        };

        var createSession = function () {
            if (worker != null)
                worker.close();
            timerStarted = false;
            if (!checkCreateSessionMaxAttempts() || !checkPingSessionMaxAttempts() || !checkCalculateSessionMaxAttempts())
                return;
            handlers.beforeCreateSession.fire();
            createSessionAttempts++;
            $.post('/processing/createsession', function (session) {
                if (checkSession(session, Processing.sessionState.Started)) {
                    currentSession = session;
                    handlers.successCreateSession.fire(session);
                    createSessionAttempts = 0;

                    worker = cw(calculation);
                    calculationSessionAttempts++;
                    worker.data(currentSession.Data).then(function (data) {
                        if (checkCurrentSession()) {
                            calculationSessionAttempts = 0;
                            //currentSession.Results = data;
                            completeSession();
                        } else {
                            setTimeout(createSession, startAgainSessionTimeout);
                        }
                    }, function (d) {
                        if (d != "closed") {
                            handlers.failSessionCalculation.fire(d);
                            setTimeout(createSession, startAgainSessionTimeout);
                        }
                    });

                    timerStarted = true;
                    startPing();
                } else {
                    setTimeout(createSession, startAgainSessionTimeout);
                }
            }).fail(function (d) {
                handlers.failCreateSession.fire(d);
                setTimeout(createSession, startAgainSessionTimeout);
            });
        };

        var pingSession = function () {
            if (!pingExecuted) {
                if (!checkPingSessionMaxAttempts())
                    return;
                pingSessionAttempts++;
                if (checkCurrentSession()) {
                    pingExecuted = true;
                    $.post('/processing/pingsession?sessionjson=' + JSON.stringify(currentSession), function (session) {
                        if (checkCurrentSession() && checkSession(session, currentSession.State)) {
                            pingSessionAttempts = 0;
                            currentSession = session;
                            handlers.successPingSession.fire(session);
                        } else {
                            setTimeout(createSession, startAgainSessionTimeout);
                        }
                        pingExecuted = false;
                    }).fail(function (d) {
                        pingExecuted = false;
                        handlers.failPingSession.fire(d);
                    });
                } else {
                    setTimeout(createSession, startAgainSessionTimeout);
                }
            }
        };

        var completeSession = function () {
            timerStarted = false;
            if (checkCurrentSession()) {
                $.post('/processing/completesession?sessionjson=' + JSON.stringify(currentSession), function (session) {
                    if (checkCurrentSession() && checkSession(session, Processing.sessionState.Completed)) {
                        handlers.successCompleteSession.fire(session);
                    }
                    setTimeout(createSession, startAgainSessionTimeout);
                }).fail(function (d) {
                    handlers.failCompleteSession.fire(d);
                    setTimeout(createSession, startAgainSessionTimeout);
                });
            } else {
                setTimeout(createSession, startAgainSessionTimeout);
            }
        };

        var cancelSession = function () {
            handlers.beforeCancelSession.fire();
            timerStarted = false;
            if (worker != null)
                worker.close();
            if (checkCurrentSession()) {
                $.post('/processing/cancelsession?sessionjson=' + JSON.stringify(currentSession), function (session) {
                    if (checkCurrentSession() && checkSession(session, Processing.sessionState.Stopped)) {
                        handlers.successCancelSession.fire(session);
                    }
                }).fail(function (d) {
                    handlers.failCancelSession.fire(d);
                });
            }
        };

        var timerStarted = false;
        var pingExecuted = false;
        var timerInterval = 500;

        var startPing = function () {
            if (timerStarted) {
                pingSession();
                setTimeout(startPing, timerInterval);
            }
        };

        this.startProcessing = createSession;
        this.stopProcessing = cancelSession;
        this.handlers = handlers;
        this.currentSession = currentSession;

    };
    Processing.sessionState = {
        Started: 1,
        Stopped: 2,
        Completed: 3
    };

    var account = {
        signIn: function (email, pwd, remember, success, fail) {
            $.post('/account/signin?email=' + email + '&pwd=' + pwd + '&remember=' + remember, success).fail(fail);
        },
        signInAnonym: function (success, fail) {
            $.post('/account/signinanonym', success).fail(fail);
        },
        signUp: function (email, pwd, success, fail) {
            $.post('/account/signup?email=' + email + '&pwd=' + pwd, success).fail(fail);
        }
    };

    var ready = function () {
        $('#btnSignIn').click(function () {
            var error = '';
            var $email = $('#txtSignInEmail');
            var email = $email.val();
            var $pwd = $('#txtSignInPwd');
            var pwd = $pwd.val();
            var $remember = $('#chkRemember');
            var remember = $remember.prop('checked') == true;
            var $alert = $("#msgSignIn");
            var $btn = $(this);

            if (email == '' || !validation.isEmail(email)) {
                error = ui.addError(error, resources.Error_Email);
                $email.parent().addClass(ui.errorClass);
                $email.focus();
            } else
                $email.parent().removeClass(ui.errorClass);
            if (pwd == '' || pwd.length < helpers.pwdMinLength) {
                if (error == '')
                    $pwd.focus();
                error = ui.addError(error, resources.Error_Password);
                $pwd.parent().addClass(ui.errorClass);
            } else
                $pwd.parent().removeClass(ui.errorClass);
            if (error == '') {
                $btn.button('loading');
                account.signIn(email, pwd, remember, function (d) {
                    $btn.button('reset');
                    if (d == "True") {
                        ui.setAlertState($alert, resources.Success_SignIn, true);
                        setTimeout(helpers.returnBack, ui.messageDelay);
                        $btn.attr('disabled', 'disabled');
                    } else {
                        ui.setAlertState($alert, resources.Error_SignIn, false);
                        $email.focus();
                    }
                }, function () {
                    $btn.button('reset');
                    ui.setAlertState($alert, resources.Error_General, false);
                });
            } else
                ui.setAlertState($alert, error, false);
            return false;
        });

        $('#btnSignUp').click(function () {
            var error = '';
            var $email = $('#txtSignUpEmail');
            var email = $email.val();
            var $pwd = $('#txtSignUpPwd');
            var pwd = $pwd.val();
            var $accept = $('#chkAccept');
            var accept = $accept.prop('checked') == true;
            var $alert = $("#msgSignUp");
            var $btn = $(this);

            if (email == '' || !validation.isEmail(email)) {
                error = ui.addError(error, resources.Error_Email);
                $email.parent().addClass(ui.errorClass);
                $email.focus();
            } else
                $email.parent().removeClass(ui.errorClass);
            if (pwd == '' || pwd.length < helpers.pwdMinLength) {
                if (error == '')
                    $pwd.focus();
                error = ui.addError(error, resources.Error_Password);
                $pwd.parent().addClass(ui.errorClass);
            } else
                $pwd.parent().removeClass(ui.errorClass);
            if (!accept) {
                error = ui.addError(error, resources.Error_NotAcceptedTerms);
            }
            if (error == '') {
                $btn.button('loading');
                account.signUp(email, pwd, function (d) {
                    $btn.button('reset');
                    if (d == "") {
                        ui.setAlertState($alert, resources.Success_SignUp, true);
                        setTimeout(helpers.returnBack, ui.messageDelay);
                        $btn.attr('disabled', 'disabled');
                    } else {
                        ui.setAlertState($alert, d, false);
                        $email.focus();
                    }
                }, function () {
                    $btn.button('reset');
                    ui.setAlertState($alert, resources.Error_General, false);
                });
            } else
                ui.setAlertState($alert, error, false);
            return false;
        });

        $('#btnSignInAnonym').click(function () {
            var $alert = $("#msgSignInAnonym");
            var $btn = $(this);
            $btn.button('loading');
            account.signInAnonym(function (d) {
                $btn.button('reset');
                if (d == 'True') {
                    ui.setAlertState($alert, resources.Success_SignInAnonym, true);
                    setTimeout(helpers.returnBack, ui.messageDelay);
                    $btn.attr('disabled', 'disabled');
                } else {
                    ui.setAlertState($alert, resources.Error_SignInAnonym, false);
                }
            }, function () {
                $btn.button('reset');
                ui.setAlertState($alert, resources.Error_General, false);
            });
            return false;
        });

        var createProcessing = function () {
            var $btn = $('#btnProcessing');
            var $alert = $('#msgProcessing');
            var processing = new Processing();
            processing.handlers.beforeCreateSession.add(function () {
                $btn.button('starting');
            });
            processing.handlers.beforeCancelSession.add(function () {
                $btn.button('stopping');
            });

            processing.handlers.failMaxAttemptsCreateSession.add(function (maxAttempts) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_MaxAttemptsCreateSession, "alert-danger");
                updateProcessingInfo(null, false);
                console.log("Fail max attempts create session: " + maxAttempts);
            });
            processing.handlers.failMaxAttemptsPingSession.add(function (maxAttempts) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_MaxAttemptsPingSession, "alert-danger");
                updateProcessingInfo(null, false);
                console.log("Fail max attempts ping session: " + maxAttempts);
            });
            processing.handlers.failMaxAttemptsCalculationSession.add(function (maxAttempts) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_MaxAttemptsCalculateSession, "alert-danger");
                updateProcessingInfo(null, false);
                console.log("Fail max attempts calculate session: " + maxAttempts);
            });

            processing.handlers.successCreateSession.add(function (session) {
                ui.setButtonState($btn, 'btn-danger', resources.Button_StopSession, 'reset', 'stop');
                ui.setAlertState($alert, resources.Success_CreateSession, "alert-success");
                updateProcessingInfo(session, true);
                console.log('Success create session: ' + JSON.stringify(session));
            });
            processing.handlers.failCreateSession.add(function (data) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_CreateSession, false);
                updateProcessingInfo(null, false);
                console.log('Fail create session: ' + JSON.stringify(data));
            });

            processing.handlers.successPingSession.add(function (session) {
                if (session.state != Processing.sessionState)
                    updateProcessingInfo(session, true);
                console.log('Success ping session: ' + JSON.stringify(session));
            });
            processing.handlers.failPingSession.add(function (data) {
                console.log('Fail ping session: ' + JSON.stringify(data));
            });

            processing.handlers.successCancelSession.add(function (session) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Success_CancelSession, "alert-warning");
                updateProcessingInfo(session, true);
                console.log('Success cancel session: ' + JSON.stringify(session));
            });
            processing.handlers.failCancelSession.add(function (data) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_CancelSession, false);
                updateProcessingInfo(null, false);
                console.log('Fail cancel session: ' + JSON.stringify(data));
            });

            processing.handlers.successCompleteSession.add(function (session) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Success_CompleteSession, true);
                updateProcessingInfo(session, true);
                console.log('Success complete session: ' + JSON.stringify(session));
            });
            processing.handlers.failCompleteSession.add(function (data) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_CompleteSession, false);
                updateProcessingInfo(null, false);
                console.log('Fail complete session: ' + JSON.stringify(data));
            });


            processing.handlers.failSessionClientNull.add(function () {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_SessionClientNull, false);
                updateProcessingInfo(null, false);
                console.log('Fail session client null');
            });
            processing.handlers.failSessionServerNull.add(function () {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_SessionServerNull, false);
                updateProcessingInfo(null, false);
                console.log('Fail session server null');
            });
            processing.handlers.failSessionInvalidState.add(function (session) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_SessionInvalidState, false);
                updateProcessingInfo(null, false);
                console.log('Fail session invalid state: ' + JSON.stringify(session));
            });
            processing.handlers.failSessionCalculation.add(function (error) {
                ui.setButtonState($btn, 'btn-success', resources.Button_StartSession, 'reset', 'start');
                ui.setAlertState($alert, resources.Error_SessionCalculation, false);
                updateProcessingInfo(null, false);
                console.log('Fail session calculation: ' + error);
            });
            return processing;
        };

        var updateProcessingInfo = function (session, show) {
            var $sessionInfo = $('#msgProcessingInfo');
            if (show && $.isPlainObject(session)) {
                var $createdDate = $('#lblCreatedDate');
                var $changedDate = $('#lblChangedDate');
                var $guid = $('#lblGuid');
                var $userName = $('#lblUserName');
                var $state = $('#lblState');
                var $stateMessage = $('#lblStateMessage');
                var $data = $('#lblData');

                $createdDate.html(helpers.parseDate(session.CreatedDate).format(ui.dateTimeFormat));
                $changedDate.html(helpers.parseDate(session.ChangedDate).format(ui.dateTimeFormat));
                $guid.html(session.Guid);
                $userName.html(session.UserName);
                var state = "";
                switch (session.State) {
                    case Processing.sessionState.Started:
                        state = resources.Label_StateStarted;
                        break;
                    case Processing.sessionState.Stopped:
                        state = resources.Label_StateStopped;
                        break;
                    case Processing.sessionState.Completed:
                        state = resources.Label_StateCompleted;
                        break;
                }
                $state.html(state);
                $stateMessage.html(session.StateMessage);
                if (session.Results != null) {
                    $data.html(session.Results).parent().removeClass('hide');
                } else {
                    $data.parent().addClass('hide');
                }

                $sessionInfo.removeClass('hide');
            } else {
                $sessionInfo.addClass('hide');
            }
        };

        var currentProcessing = createProcessing();

        $('#btnProcessing').click(function () {
            var $btn = $(this);
            var state = $btn.data('state');
            if (state == null) {
                state = 'start';
                $btn.data('state', state);
            }
            if (state == 'start') {
                currentProcessing.startProcessing();
            }
            else if (state == 'stop') {
                currentProcessing.stopProcessing();
            }
        });
    };

    window.JSD = function () {
        this.helpers = helpers;
        this.validation = validation;
        this.Processing = Processing;
        this.resources = resources;

        $(document).ready(ready);
    };

    window.jsd = new JSD();
})();