var extension;
var anyValueModified = false;
var ignoreFieldsChanges = false;
var selectedRow;
var selectedRuleRow;
var switchRulesEnabled;

function init() {
    extension = chrome.extension.getBackgroundPage();
    ProfileManager = extension.ProfileManager;
    RuleManager = extension.RuleManager;
    Settings = extension.Settings;
    Logger = extension.Logger;
    Utils = extension.Utils;
    I18n = extension.I18n;
    ProxyPlugin = extension.ProxyPlugin;

    I18n.process(document);
    document.body.style.visibility = "visible";

    initUI();
    loadOptions();
    checkPageParams();

    HelpToolTip.enableTooltips();
}

function initUI() {
    // Tab Control
    $("#tabsContainer div").click(function () {
        $("#tabsContainer div").removeClass("selected").addClass("normal");
        $(this).removeClass("normal").addClass("selected");
        $("#body .tab").hide();
        $("#" + $(this).attr("id") + "Body").show();
        if (this.id == "tabImportExport")
            $(".control").hide();
        else
            $(".control").show();
    });

    // Proxy Profiles
    $("#profileName").bind("keyup change", function () {
        $("td:first", selectedRow).text($(this).val()); // sync profile title changes
        selectedRow[0].profile.name = $(this).val();
        onFieldModified(true);
    });
    $("#modeManual, #modeAuto").change(function () {
        if ($("#modeManual").is(":checked")) {
            selectedRow[0].profile.proxyMode = ProfileManager.ProxyModes.manual;
            $("#httpRow, #sameProxyRow, #httpsRow, #ftpRow, #socksRow, #socksVersionRow").removeClass("disabled");
            $("#httpRow input, #sameProxyRow input, #httpsRow input, #ftpRow input, #socksRow input, #socksVersionRow input").removeAttr("disabled");
            $("#configUrlRow, #importPACButton").addClass("disabled");
            $("#configUrlRow input, #importPACButton").attr("disabled", "disabled");
            $("#useSameProxy").change();
        } else {
            selectedRow[0].profile.proxyMode = ProfileManager.ProxyModes.auto;
            $("#httpRow, #sameProxyRow, #httpsRow, #ftpRow, #socksRow, #socksVersionRow").addClass("disabled");
            $("#httpRow input, #sameProxyRow input, #httpsRow input, #ftpRow input, #socksRow input, #socksVersionRow input").attr("disabled", "disabled");
            $("#configUrlRow, #importPACButton").removeClass("disabled");
            $("#configUrlRow input, #importPACButton").removeAttr("disabled");
        }
        onFieldModified(true);
    });
    $("#httpProxyHost, #httpProxyPort").change(function () {
        selectedRow[0].profile.proxyHttp = joinProxy($("#httpProxyHost").val(), $("#httpProxyPort").val(), 80);
        onFieldModified(true);
    });
    $("#useSameProxy").change(function () {
        if ($(this).is(":checked")) {
            selectedRow[0].profile.useSameProxy = true;
            $("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").hide();
//			$("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").addClass("disabled");
//			$("#httpsRow input, #ftpRow input, #socksRow input, #socksVersionRow input").attr("disabled", "disabled");
        } else {
            selectedRow[0].profile.useSameProxy = false;
            $("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").show();
//			$("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").removeClass("disabled");
//			$("#httpsRow input, #ftpRow input, #socksRow input, #socksVersionRow input").removeAttr("disabled");
        }
        onFieldModified(true);
    });
    $("#httpsProxyHost, #httpsProxyPort").change(function () {
        selectedRow[0].profile.proxyHttps = joinProxy($("#httpsProxyHost").val(), $("#httpsProxyPort").val(), 443);
        onFieldModified(true);
    });
    $("#ftpProxyHost, #ftpProxyPort").change(function () {
        selectedRow[0].profile.proxyFtp = joinProxy($("#ftpProxyHost").val(), $("#ftpProxyPort").val(), 21);
        onFieldModified(true);
    });
    $("#socksProxyHost, #socksProxyPort").change(function () {
        selectedRow[0].profile.proxySocks = joinProxy($("#socksProxyHost").val(), $("#socksProxyPort").val(), 80);
        onFieldModified(true);
    });
    $("#socksV4, #socksV5").change(function () {
        selectedRow[0].profile.socksVersion = $("#socksV5").is(":checked") ? 5 : 4;
        onFieldModified(true);
    });
    $("#proxyExceptions").change(function () {
        selectedRow[0].profile.proxyExceptions = $(this).val();
        onFieldModified(true);
    });
    $("#proxyConfigUrl").change(function () {
        selectedRow[0].profile.proxyConfigUrl = $(this).val();
        onFieldModified(true);
    });

    // Switch Rules
    $("#cmbDefaultRuleProfile").change(function () {
        var rule = this.parentNode.parentNode.parentNode.rule;
        rule.profileId = $("option:selected", this)[0].profile.id;
        onFieldModified(false);
    });

    $("#chkRuleList").change(function () {
        if ($(this).is(":checked")) {
            $("#ruleListsTable *, #autoProxy").removeClass("disabled");
            $("#ruleListsTable input, #ruleListsTable select, #autoProxy input").removeAttr("disabled");
        } else {
            $("#ruleListsTable *, #autoProxy").addClass("disabled");
            $("#ruleListsTable input, #ruleListsTable select, #autoProxy input").attr("disabled", "disabled");
        }
        onFieldModified(false);
    });

    $("#txtRuleListUrl, #cmbRuleListProfile, #cmbRuleListReload, #chkAutoProxy").change(function () {
        onFieldModified(false);
    });

    // Network
    $("#chkMonitorProxyChanges").change(function () {
        if ($(this).is(":checked"))
            $("#chkPreventProxyChanges").removeAttr("disabled").parent().removeClass("disabled");
        else
            $("#chkPreventProxyChanges").attr("disabled", "disabled").parent().addClass("disabled");
    });

    $("#chkMonitorProxyChanges, #chkPreventProxyChanges").change(function () {
        onFieldModified(false);
    });

    // Import-Export
    $("#txtBackupFilePath").bind("click keydown", function () {
        if ($(this).hasClass("initial"))
            $(this).removeClass("initial").val("");
    });

    // General
    $("#chkQuickSwitch").change(function () {
        if ($(this).is(":checked")) {
            $("#quickSwitchDiv ul").removeClass("disabled").sortable("enable");
        } else {
            $("#quickSwitchDiv ul").addClass("disabled").sortable("disable");
        }
        onFieldModified(false);
    });
    $("#quickSwitchDiv ul").sortable({
        connectWith:"#quickSwitchDiv ul",
        change:function () {
            onFieldModified(false);
        }
    }).disableSelection();


    $("#chkConfirmDeletion, #chkRefreshTab").change(function () {
        onFieldModified(false);
    });

    // Reverse buttons order on Linux and Mac OS X
    if (!Utils.OS.isWindows) {
        var btnSaveContainer = $("#btnSave").parent();
        btnSaveContainer.next().next().insertBefore(btnSaveContainer);
        btnSaveContainer.next().insertBefore(btnSaveContainer);
    }
}

function loadOptions() {
    // Proxy Profiles
    ignoreFieldsChanges = true;
    $("#proxyProfiles .tableRow").remove();
    ProfileManager.loadProfiles();
    var profiles = ProfileManager.getSortedProfileArray();
    var profilesTemp = ProfileManager.getProfiles();
    var currentProfile = ProfileManager.getCurrentProfile();
    var lastSelectedProfile = selectedRow;
    selectedRow = undefined;
    var i, profile, row, rule;
    for (i in profiles) {
        if (profiles.hasOwnProperty(i)) {
            profile = profiles[i];
            if (!profile.id || profile.id.length == 0 || profile.id == "unknown") {
                generateProfileId(profilesTemp, profile);
                profilesTemp[profile.id] = profile;
            }

            //row = newRow(profile);

            if (lastSelectedProfile && profile.id == lastSelectedProfile[0].profile.id)
                $("td:first", row).click(); // selects updated profile
        }
    }

    if (currentProfile.unknown) {
        if (!RuleManager.isAutomaticModeEnabled(currentProfile)
            && currentProfile.proxyMode != ProfileManager.ProxyModes.direct) {
            currentProfile.name = ProfileManager.currentProfileName;
            row = newRow(currentProfile);
        }
    } else if (profiles.length == 0) {
        row = newRow(undefined);
        if (!selectedRow)
            $("td:first", row).click();
    }

    if (!selectedRow)
        $("#proxyProfiles .tableRow td:first").click();

    // Switch Rules
    RuleManager.loadRules();
    var defaultRule = RuleManager.getDefaultRule();
    $("#rulesTable .defaultRow")[0].rule = defaultRule;
    switchRulesEnabled = RuleManager.isEnabled();

    $("#rulesTable .tableRow").remove();
    var rules = RuleManager.getSortedRuleArray();
    var rulesTemp = RuleManager.getRules();
    selectedRuleRow = undefined;
    for (i in rules) {
        if (rules.hasOwnProperty(i)) {
            rule = rules[i];
            console.log(rule);
            if (!rule.id || rule.id.length == 0) {
                generateRuleId(rulesTemp, rule);
                rulesTemp[rule.id] = rule;
            }

        }
    }

    if (RuleManager.isRuleListEnabled())
        $("#chkRuleList").attr("checked", "checked");

    $("#chkRuleList").change();
    $("#txtRuleListUrl").val(Settings.getValue("ruleListUrl", ""));
    $("#cmbRuleListReload option[value='" + Settings.getValue("ruleListReload", 720) + "']").attr("selected", "selected");
    var ruleListProfileId = Settings.getValue("ruleListProfileId", -1);
    if (Settings.getValue("ruleListAutoProxy", false))
        $("#chkAutoProxy").attr("checked", "checked");

    // Network
    if (Settings.getValue("monitorProxyChanges", true))
        $("#chkMonitorProxyChanges").attr("checked", "checked");
    if (Settings.getValue("preventProxyChanges", false))
        $("#chkPreventProxyChanges").attr("checked", "checked");

    $("#chkMonitorProxyChanges").change();
    $("#chkPreventProxyChanges").change();

    // General
    if (Settings.getValue("quickSwitch", false))
        $("#chkQuickSwitch").attr("checked", "checked");

    $("#chkQuickSwitch").change();

    $("#cycleEnabled, #cycleDisabled, #cmbDefaultRuleProfile, #cmbRuleListProfile, #cmbStartupProfile").empty();
    var directProfile = ProfileManager.directConnectionProfile;
    var autoProfile = ProfileManager.autoSwitchProfile;
    var systemProfile = ProfileManager.systemProxyProfile;
    profiles.unshift(directProfile);

    var ps = new Array();

    $.each(profiles, function (key, profile) {
        var ii = $("<option>").attr("value", profile.id).text(profile.name);
        var item = ii.clone();
        item[0].profile = profile;
        if (defaultRule.profileId == profile.id)
            item.attr("selected", "selected");

        $("#cmbDefaultRuleProfile").append(item);

        item = ii.clone();
        item[0].profile = profile;
        if (ruleListProfileId == profile.id)
            item.attr("selected", "selected");

        $("#cmbRuleListProfile").append(item);

        ps[profile.id] = profile;
    });

    ps[autoProfile.id] = autoProfile;
    ps[systemProfile.id] = systemProfile;

    var startupProfileId = Settings.getValue("startupProfileId", "");

    var item = $("<option>").attr("value", "").text(I18n.getMessage("options_lastSelectedProfile"));
    item[0].profile = { id:"" };
    $("#cmbStartupProfile").append(item);

    for (i in ps) {
        if (ps.hasOwnProperty(i)) {
            profile = ps[i];
            ii = $("<option>").attr("value", profile.id).text(profile.name);
            ii[0].profile = profile;

            if (startupProfileId == profile.id)
                ii.attr("selected", "selected");
            $("#cmbStartupProfile").append(ii);
        }
    }

    var cycleEnabled = $("#cycleEnabled");
    var cycleDisabled = $("#cycleDisabled");
    var QSP = Settings.getObject("quickSwitchProfiles") || [];

    $.each(QSP, function (key, pid) {
        var profile = ps[pid];
        if (profile == undefined) return;
        var ii = $("<li>").text(profile.name).append($("<div>").addClass(profile.color));
        ii[0].profile = profile;
        cycleEnabled.append(ii);
        ps[profile.id] = undefined;
    });
    for (i in ps) {
        if (ps.hasOwnProperty(i)) {
            profile = ps[i];
            if (profile == undefined) continue;
            var ii = $("<li>").text(profile.name).append($("<div>").addClass(profile.color));
            ii[0].profile = profile;
            cycleDisabled.append(ii);
        }
    }

    $("#quickSwitchDiv ul").sortable("refresh");


    if (Settings.getValue("confirmDeletion", true))
        $("#chkConfirmDeletion").attr("checked", "checked");
    if (Settings.getValue("refreshTab", false))
        $("#chkRefreshTab").attr("checked", "checked");

    $("#chkConfirmDeletion").change();
    $("#chkRefreshTab").change();

    $("#lastListUpdate").text(Settings.getValue("lastListUpdate", "Never"));

    // Done
    ignoreFieldsChanges = false;
    anyValueModified = false;
}

function apply2All() {
    var id = $("#rulesTable .defaultRow")[0].rule.profileId;
    var select = $("#rulesTable .defaultRow select")[0];
    var name = select.selectedOptions[0].innerText;
    if (!InfoTip.confirmI18n("message_apply2All", name)) return;
    var rs = $("#rulesTable .tableRow");
    $("select[name=profileId]", rs).val(id);
    rs.each(function (i, t) {
        t.rule.profileId = id;
    });
    onFieldModified(true);
}

function closeWindow() {
    window.close();
}

function switchTab(tab) {
    var tabId;
    switch (tab) {
        case "rules":
            tabId = "tabRules";
            break;

        case "network":
            tabId = "tabNetwork";
            break;

        case "importexport":
            tabId = "tabImportExport";
            break;

        case "general":
            tabId = "tabGeneral";
            break;

        default:
            tabId = "tabProfiles";
            break;
    }
    $("#" + tabId).click();
}

function onFieldModified(isChangeInProfile) {
    if (ignoreFieldsChanges) // ignore changes when they're really not changes (populating fields)
        return;

    if (isChangeInProfile && selectedRow != undefined) {
        delete selectedRow[0].profile.unknown; // so it can be saved (when clicking Save)
        selectedRow.removeClass("unknown");
    }
    anyValueModified = true;
}

function generateProfileId(profiles, profile) {
    var profileId = profile.name;
    if (profiles[profileId] != undefined || profileId == ProfileManager.directConnectionProfile.id) {
        for (var j = 2; ; j++) {
            var newId = profileId + j;
            if (profiles[newId] == undefined) {
                profileId = newId;
                break;
            }
        }
    }
    profile.id = profileId;
}

function generateRuleId(rules, rule) {
    var ruleId = rule.name;
    if (rules[ruleId] != undefined) {
        for (var j = 2; ; j++) {
            var newId = ruleId + j;
            if (rules[newId] == undefined) {
                ruleId = newId;
                break;
            }
        }
    }
    rule.id = ruleId;
}


function deleteRow() {
    var row = event.target.parentNode.parentNode;
    if (!Settings.getValue("confirmDeletion", true)
        || InfoTip.confirmI18n("message_deleteSelectedProfile", row.children[0].innerText)) {

        if (selectedRow != undefined && selectedRow[0] == row)
            onSelectRow({}); // to clear fields.

        $(row).remove();

        loadOptions();
        extension.setIconInfo();
        InfoTip.showMessageI18n("message_profileDeleted", InfoTip.types.info);
    }
}

function changeColor() {
    var target = event.target.onclick ? event.target.children[0] : event.target;
    var cell = $(target);
    var profile = target.parentNode.parentNode.parentNode.profile;
    var color;

    if (cell.attr("class") == "" || cell.hasClass("blue"))
        color = "green";
    else if (cell.hasClass("green"))
        color = "red";
    else if (cell.hasClass("red"))
        color = "yellow";
    else if (cell.hasClass("yellow"))
        color = "purple";
    else if (cell.hasClass("purple"))
        color = "blue";

    cell.attr("class", color);
    profile.color = color;
}

function onSelectRow(e) {
    var profile;
    if (e.target) { // fired on event?
        var row = $(this).parent();
        if (selectedRow)
            selectedRow.removeClass("selected");

        row.addClass("selected");
        selectedRow = row;

        profile = row[0].profile;

    } else { // or by calling
        profile = e;
    }

    ignoreFieldsChanges = true;
    var proxyInfo;
    $("#profileName").val(profile.name || "");

    proxyInfo = parseProxy(profile.proxyHttp || "", 80);
    $("#httpProxyHost").val(proxyInfo.host);
    $("#httpProxyPort").val(proxyInfo.port);

    if (profile.useSameProxy) {
        $("#useSameProxy").attr("checked", "checked");
    }
    else {
        $("#useSameProxy").removeAttr("checked");
    }
    $("#useSameProxy").change();

    if (profile.proxyMode == ProfileManager.ProxyModes.manual) {
        $("#modeManual").attr("checked", "checked");
        $("#modeAuto").removeAttr("checked");
    }
    else {
        $("#modeManual").removeAttr("checked");
        $("#modeAuto").attr("checked", "checked");
    }
    $("#modeManual").change();

    proxyInfo = parseProxy(profile.proxyHttps || "", 443);
    $("#httpsProxyHost").val(proxyInfo.host);
    $("#httpsProxyPort").val(proxyInfo.port);

    proxyInfo = parseProxy(profile.proxyFtp || "", 21);
    $("#ftpProxyHost").val(proxyInfo.host);
    $("#ftpProxyPort").val(proxyInfo.port);

    proxyInfo = parseProxy(profile.proxySocks || "", 80);
    $("#socksProxyHost").val(proxyInfo.host);
    $("#socksProxyPort").val(proxyInfo.port);

    if (profile.socksVersion == 5)
        $("#socksV5").attr("checked", "checked");
    else
        $("#socksV4").attr("checked", "checked");

    $("#proxyExceptions").val(profile.proxyExceptions || "");

    $("#proxyConfigUrl").val(profile.proxyConfigUrl || "");

    $("#profileName").focus().select();

    ignoreFieldsChanges = false;
}

function enterFieldEditMode(cell) {
    var input = $("input", cell);
    var span = $("span", cell);
    if (input.is(":visible"))
        return;
    var v = span.text();
    if (v == "-")
        input.val("");
    else
        input.val(span.text());
    input.toggle();
    span.toggle();
    input.focus();
//	input.select();
}

function exitFieldEditMode(cell) {
    var input = $("input", cell);
    var span = $("span", cell);
    var newValue = input.val().replace(/(^\s*)|(\s*$)/g, "");
    if (newValue == "")
        newValue = "-"; // workaround for jQuery bug (toggling an empty span).

    if (!anyValueModified)
        anyValueModified = (span.text() != newValue);

    var rule = cell.parentNode.parentNode.rule;
    rule[input.attr("name")] = input.val();

    span.text(newValue);
    input.toggle();
    span.toggle();
}

function deleteRuleRow() {
    var row = event.target.parentNode.parentNode;
    if (switchRulesEnabled
        && (!Settings.getValue("confirmDeletion", true)
        || InfoTip.confirmI18n("message_deleteSelectedRule", row.children[0].innerText))) {
        $(row).remove();
        loadOptions();
        extension.setIconInfo();
        InfoTip.showMessageI18n("message_ruleDeleted", InfoTip.types.info);
    }
}

function saveFileAs(fileName, fileData) {
    try {
        var Blob = window.Blob || window.WebKitBlob;

        // Detect availability of the Blob constructor.
        var constructor_supported = false;
        if (Blob) {
          try {
            new Blob([], { "type" : "text/plain" });
            constructor_supported = true;
          } catch (_) { }
        }

        var b = null;
        if (constructor_supported) {
          b = new Blob([fileData], { "type" : "text/plain" });
        } else {
          // Deprecated BlobBuilder API
          var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
          var bb = new BlobBuilder();
          bb.append(fileData);
          b = bb.getBlob("text/plain");
        }

        saveAs(b, fileName);
    } catch (e) {
        Logger.log("Oops! Can't save generated file, " + e.toString(), Logger.Types.error);
        InfoTip.alertI18n("message_cannotSaveFile");
    }
}

function exportPacFile() {
    var script = RuleManager.generateAutoPacScript();

    saveFileAs("SwitchyPac.pac", script);
}

function exportRuleList() {
    var ruleListData = RuleManager.generateRuleList();

    saveFileAs("SwitchyRules.ssrl", ruleListData);
}

function makeBackup() {
    var options = {};
    for (var optionName in localStorage) {
        if (localStorage.hasOwnProperty(optionName) && optionName != "ruleListRules") {
            options[optionName] = localStorage[optionName];
        }
    }

    var backupData = $.base64Encode(JSON.stringify(options));

    saveFileAs("PigProxy.conf", backupData);
}

function restoreBackup() {
    var txtBackupFilePath = $("#txtBackupFilePath");
    if (txtBackupFilePath.hasClass("initial") || txtBackupFilePath.val().trim().length == 0) {
        InfoTip.alertI18n("message_selectBackupFile");
        txtBackupFilePath.focus();
        return;
    }
    var backupFilePath = txtBackupFilePath.val();
    var backupData = undefined;

    $.ajax({
        async:false,
        url:backupFilePath,
        success:function (data) {
            if (data.length <= 1024 * 50) // bigger than 50 KB
                backupData = data;
            else
                Logger.log("Too big backup file!", Logger.Types.error);
        },
        error:function () {
            Logger.log("Error downloading the backup file!", Logger.Types.warning);
        },
        dataType:"text",
        cache:false,
        timeout:10000
    });

    restoreBase64Json(backupData);
}
function restoreLocal() {
    var rfile = $("#rfile")[0];
    if (rfile.files.length > 0 && rfile.files[0].name.length > 0) {
        var r = new FileReader();
        r.onload = function (e) {
            restoreBase64Json(e.target.result);
        };
        r.onerror = function () {
            InfoTip.alertI18n("message_cannotReadOptionsBackup");
        };
        r.readAsText(rfile.files[0]);
        rfile.value = "";
    }
}
function importPAC() {
    var pfile = $("#pfile")[0];
    if (pfile.files.length > 0 && pfile.files[0].name.length > 0) {
        var r = new FileReader();
        r.onload = function (e) {
            $("#proxyConfigUrl").val(selectedRow[0].profile.proxyConfigUrl = e.target.result);
            onFieldModified(true);
        };
        r.onerror = function () {
            InfoTip.alertI18n("message_cannotReadOptionsBackup");
        };
        r.readAsDataURL(pfile.files[0]);
        pfile.value = "";
    }
}
function restoreBase64Json(j) {
    var o;
    try {
        j = $.base64Decode(j);
        o = JSON.parse(j);
    }
    catch (e) {
        Logger.log("Oops! Can't restore from this backup file. The backup file is corrupted or invalid, " + e.toString(), Logger.Types.error);
        InfoTip.alertI18n("message_cannotRestoreOptionsBackup");
        return;
    }
    restoreObject(o);
}
function restoreObject(o) {
    if (!InfoTip.confirmI18n("message_restoreOptionsBackup")) {
        return;
    }
    for (var optionName in o) {
        if (o.hasOwnProperty(optionName)) {
            localStorage[optionName] = o[optionName];
        }
    }
    InfoTip.alertI18n("message_successRestoreOptionsBackup");
    Settings.refreshCache();
    window.location.reload();
}

function getQueryParams() {
    var query = document.location.search || "";
    if (query.indexOf("?") == 0)
        query = query.substring(1);

    query = query.split("&");

    var params = [];
    for (var i in query) {
        if (query.hasOwnProperty(i)) {
            var pair = query[i].split("=");
            params[pair[0]] = pair[1];
        }
    }

    return params;
}

function checkPageParams() {
    var params = getQueryParams();
    if (params["firstTime"] == "true")
        InfoTip.showMessageI18n("message_firstTimeWelcome", InfoTip.types.note, -1);

    if (params["rulesFirstTime"] == "true")
        InfoTip.showMessageI18n("message_rulesFirstTimeWelcome", InfoTip.types.note, -1);

    switchTab(params["tab"]);
}

function parseProxy(proxy, port) {
    if (proxy == undefined || proxy.length == 0) {
        return {
            host:"",
            port:""
        };
    }

    proxy = fixProxyString(proxy, port);
    var pos = proxy.lastIndexOf(":");
    var host = (pos > 0 ? proxy.substring(0, pos) : proxy);
    port = (pos > 0 ? proxy.substring(pos + 1) : "");
    return {
        host:host,
        port:port
    };
}

function joinProxy(proxy, port, defaultPort) {
    if (proxy.indexOf(":") >= 0 && (proxy[0] != '[' || proxy[proxy.length - 1] != ']'))
        return proxy;

    if (port != undefined && port.trim().length == 0)
        port = defaultPort || "80";

    return proxy + ":" + port;
}

function fixProxyString(proxy, defaultPort) {
    if (proxy == undefined || proxy.length == 0)
        return "";

    if (proxy.indexOf(":") > 0)
        return proxy;

    if (proxy.indexOf(":") == 0)
        return "";

    defaultPort = defaultPort || "80";
    return proxy + ":" + defaultPort;
}
$(document).ready(function(){
    init();
    $("body").on("click", "div.color", changeColor);
    $("body").on("click", "div.delete.row", deleteRow);
    $("#btn-new").click(function() { newRow(); });
    $("#rfile").change(restoreLocal);
    $("#RestoreFileButton").click(function(){
        $("#rfile").click();
    });
    $("#pfile").change(importPAC);
    $("#importPACButton").click(function(){
        $("#pfile").click();
    });
    $("body").on("click", "div.delete.rule", deleteRuleRow);
    $("#apply2All").click(apply2All);
    $("#exportPacFile").click(exportPacFile);
    $("#exportRuleList").click(exportRuleList);
    $("#makeBackup").click(makeBackup);
    $("#restoreBackup").click(restoreBackup);
    $("#closeWindow").click(closeWindow);
    
    
    if(localStorage['uname']){
        $("#uname").val(localStorage['uname']);
    }
    $("#login").click(function(){
        var uname = $("#uname").val();
        var upsd = $("#upsd").val();
        if(uname==''){
            InfoTip.showMessage('请输入用户名');
            $("#uname").focus();
            return;
        }
        if(upsd==''){
            InfoTip.showMessage('请输入密码');
            $("#upsd").focus();
            return;
        }
        localStorage['upsd'] = '';
        var url = 'http://www.pigtools.cn/xueshu/login.php?uname=' + uname + '&upsd=' + upsd + '&cid=' + localStorage['cid'] + '&eid=' + chrome.app.getDetails().id + '&ver=' + chrome.app.getDetails().version;
        //console.log(url);
        Ajax(url, "", function(r) {
            r = JSON.parse(r.responseText);
            console.log(r);
            if(r.result!==0){
                InfoTip.showMessage('用户名或密码错误');
                $("#upsd").focus();
                return;
            }
            localStorage['uname'] = uname;
            localStorage['upsd'] = r.upsd;
            InfoTip.showMessage('登录成功');
            window.setTimeout(function() {
                restoreBase64JsonM(r.data);
                /*var profile = {color: "auto-blue", id: "auto", isAutomaticModeProfile: true, name: "[自动切换]", proxyConfigUrl: ":memory:", proxyMode: "auto"};
                ProfileManager.applyProfile(profile);
                extension.setIconInfo(profile);*/
            }, 500);
        }, document);
    });
});


function Ajax(url, r, fn, doc) {
    var xhr = new XMLHttpRequest;
    xhr.onreadystatechange = function() {
        4 == xhr.readyState && fn(xhr, doc);
    };
    try {
        xhr.open("GET", url, true);
    } catch (e) {
        return!1;
    }
    xhr.send(r);
}
function restoreBase64JsonM(j) {
    var o;
    try {
        j = $.base64Decode(j);
        o = JSON.parse(j);
    }
    catch (e) {
        Logger.log("Oops! Can't restore from this backup file. The backup file is corrupted or invalid, " + e.toString(), Logger.Types.error);
        return;
    }
    restoreObjectM(o);
}
function restoreObjectM(o) {
    for (var optionName in o) {
        if (o.hasOwnProperty(optionName)) {
            localStorage[optionName] = o[optionName];
        }
    }
    Settings.refreshCache();
    window.location.reload();
}