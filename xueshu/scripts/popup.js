var extension;

var activeTabDomain = null;

var autoEnabled = false;

function init() {
    extension = chrome.extension.getBackgroundPage();
    App = extension.App;
    ProfileManager = extension.ProfileManager;
    RuleManager = extension.RuleManager;
    Settings = extension.Settings;
    Utils = extension.Utils;
    I18n = extension.I18n;
    autoEnabled = RuleManager.isEnabled();
    I18n.process(document);
    document.body.style.visibility = "visible";

    buildMenuItems();
    initUI();
}
function showTempRule() {
    $("#divDomain").remove();
    $("#menuAddTempRule").show();
}
function initUI() {
    $(".close").click(closePopup);

    var state = ProfileManager.getCurrentProfile().id=='auto'?true:false;
    $("#switch-animate").bootstrapSwitch({
        size: "small",
        state: state,
        onSwitchChange: function(event, state) {
            event.preventDefault();
            if (state == false) {
                var profile = {color: "inactive", id: "system", name: "[系统代理]", proxyMode: "system"};
                ProfileManager.applyProfile(profile);
                extension.setIconInfo(profile);
            } else {
                var profile = {color: "auto-blue", id: "auto", isAutomaticModeProfile: true, name: "[自动切换]", proxyConfigUrl: ":memory:", proxyMode: "auto"};
                ProfileManager.applyProfile(profile);
                extension.setIconInfo(profile);
            }
            //closePopup();
            if (profile.isAutomaticModeProfile) {
                checkRulesFirstTimeUse();
            }
            refreshTab();
        }
    });

    $(".versionNumber").text(App.version);

    showAbout();
}

function closePopup() {
    window.close();
}

function refreshTab() {
    if (Settings.getValue("refreshTab", false))
        chrome.tabs.executeScript(null, {code: "history.go(0);"});
}

function openOptions() {
    closePopup();
    extension.openOptions();
}

function openMainWebsite() {
    closePopup();
    chrome.tabs.create({
        url: 'https://scholar.google.com'
    });
}

function openPlusWebsite() {
    closePopup();
    chrome.tabs.create({
        url: 'https://chrome.google.com/webstore/detail/enhonobfbhffceeljombdpgeehmaphek'
    });
}

function openSupportWebsite() {
    closePopup();
    chrome.tabs.create({
        url: 'http://xueshu.pigtools.cn/feedback.php'
    });
}

function showAbout() {
    var currentBodyDirection = document.body.style.direction;	// ....workaround for a Chrome bug
    document.body.style.direction = "ltr";						// ....prevents resizing the popup
    $("#about").css("visibility", "hidden");					// ....

    $("#menu").hide();
    $("#about").show();
    $(document.body).height($("#about").height());
    $(window).height($("#about").height());

    document.body.style.direction = currentBodyDirection;		// ....if the body's direction is "rtl"
    $("#about").css("visibility", "visible");					// ....
}

function clearMenuProxyItems() {
    $("#proxies .item").remove();
}

var addTempRule = function addTempRule() {
    var combobox = $("#cmbTempProfileId");
    closePopup();
    RuleManager.addTempRule(activeTabDomain, combobox.val());
    refreshTab();
};

function buildMenuProxyItems(currentProfile) {
    var profiles = ProfileManager.getSortedProfileArray();
    var pp = RuleManager.LastProfile;
    var menu = $("#proxies");
    var templateItem = $("#proxies .templateItem");
    var combobox = $("#cmbTempProfileId");
    var item;
    combobox.change(addTempRule);
    for (var i in profiles) {
        if (profiles.hasOwnProperty(i)) {
            var profile = profiles[i];
            item = templateItem.clone().attr({
                "id": profile.id || profile.name,
                "name": profile.name,
                "title": ProfileManager.profileToString(profile, true),
                "class": "item proxy " + profile.color
            });
            $("span", item).text(profile.name);
            item.click(onSelectProxyItem);
            item[0].profile = profile;
            if (ProfileManager.equals(profile, currentProfile))
                item.addClass("checked");

            menu.append(item);

            if (autoEnabled && pp) {
                item = $("<option>").attr("value", profile.id).text(profile.name);
                item[0].profile = profile;
                if (pp.id == profile.id)
                    item.attr("selected", "selected");
                combobox.append(item);
            }
        }
    }

    $("#separatorProxies").show();

    if (currentProfile.unknown && currentProfile.proxyMode != ProfileManager.ProxyModes.direct) {
        item = templateItem.clone().attr({
            "id": currentProfile.id,
            "name": currentProfile.name,
            "title": ProfileManager.profileToString(currentProfile, true),
            "class": "item proxy checked"
        });
        $("span", item).text(currentProfile.name);
        item.click(onSelectProxyItem);
        item[0].profile = currentProfile;

        menu.append(item);

    } else if (profiles.length == 0) {
        $("#separatorProxies").hide();
    }
}

function buildMenuDirectConnectionItem(currentProfile) {
    var item = $("#directConnection");
    item.click(onSelectProxyItem);
    var profile = ProfileManager.directConnectionProfile;
    item[0].profile = profile;
    if (currentProfile.proxyMode == ProfileManager.ProxyModes.direct)
        item.addClass("checked");
    else if (autoEnabled) {
        item = $("<option>").attr("value", profile.id).text(profile.name);
        item[0].profile = profile;
        $("#cmbTempProfileId").append(item);
    }
}

function buildMenuSystemProxyItem(currentProfile) {
    var item = $("#systemProxy");
    item.click(onSelectProxyItem);
    item[0].profile = ProfileManager.systemProxyProfile;
    if (currentProfile.proxyMode == ProfileManager.ProxyModes.system)
        item.addClass("checked");
}

function buildMenuAutomaticModeItem(currentProfile) {
    var item = $("#automaticMode");
    if (autoEnabled && (activeTabDomain = RuleManager.LastDomain)) {
        $("#spanDomain").text(activeTabDomain);
    }
    else {
        $("#menuAddRule, #divDomain").hide();
        if (!autoEnabled) {
            item.hide();
            return;
        }
    }
    var autoProfile = RuleManager.getAutomaticModeProfile();
    item.click(onSelectProxyItem);
    item[0].profile = autoProfile;
    if (RuleManager.isAutomaticModeEnabled(currentProfile)) {
        item.addClass("checked");
        delete currentProfile.unknown; // to prevent adding <current profile> item.
    }
}

function buildMenuItems() {
    var currentProfile = ProfileManager.getCurrentProfile();
    clearMenuProxyItems();
    buildMenuDirectConnectionItem(currentProfile);
    buildMenuSystemProxyItem(currentProfile);
    buildMenuAutomaticModeItem(currentProfile);
    buildMenuProxyItems(currentProfile);
}

function onSelectProxyItem() {
    if (!event || !event.target)
        return;

    var item = (event.target.id) ? $(event.target) : $(event.target.parentNode); // click on the item or its child?
    var profile = item[0].profile;

    ProfileManager.applyProfile(profile);
    extension.setIconInfo(profile);

    closePopup();

    $("#menu .item").removeClass("checked");
    item.addClass("checked");

    if (profile.isAutomaticModeProfile)
        checkRulesFirstTimeUse();
    refreshTab();
}

function checkRulesFirstTimeUse() {
    if (!Settings.keyExists("rulesFirstTime")) {
        Settings.setValue("rulesFirstTime", ";]");
        if (!RuleManager.hasRules()) {
            var url = "options.html?rulesFirstTime=true&tab=rules";
            chrome.tabs.create({url: url});
        }
    }
}

$(document).ready(function() {
    init();
    $("#openMainWebsite").click(openMainWebsite);
    
    if(localStorage['uname'] && localStorage['upsd']){
        $("#login").html(localStorage['uname']);
    }else{
        $("#login").html('登录');
    }
    $("#login").click(openOptions);
});
