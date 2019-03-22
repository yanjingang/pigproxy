var iconDir = "images/";
var iconInactivePath = "images/inactive.png";

var App = chrome.app.getDetails();

var InitComplete = false;

function init() {
    checkOptions();
    if (RuleManager.isEnabled() && RuleManager.isRuleListEnabled()) {
        ProxyPlugin.setProxyCallback = function () {
            RuleManager.loadRuleListCallback = function () {
                applySavedOptions();
                InitComplete = true;
            };
            RuleManager.loadRuleList(true);
        };
    }
    else {
        ProxyPlugin.setProxyCallback = function () {
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

    chrome.browserAction.onClicked.addListener(function () {
        if (!Settings.getValue("quickSwitch", false)) return;

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
        if (sel || typeof(profileId) == "undefined") {
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
            chrome.tabs.executeScript(null, { code:"history.go(0);" });
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

function checkOptions(){
    if(localStorage['profiles'] == undefined){
        var backupData = 'eyJjb25maWciOiJ7XCJmaXJzdFRpbWVcIjpcIjpdXCIsXCJwcm94eU1vZGVcIjpcImF1dG9cIixcImF1dG9QYWNTY3JpcHRQYXRoXCI6XCI6bWVtb3J5OlwiLFwicnVsZUxpc3RVcmxcIjpcImh0dHBzOi8vYXV0b3Byb3h5LWdmd2xpc3QuZ29vZ2xlY29kZS5jb20vc3ZuL3RydW5rL2dmd2xpc3QudHh0XCIsXCJydWxlTGlzdFJlbG9hZFwiOlwiNzIwXCIsXCJydWxlTGlzdFByb2ZpbGVJZFwiOlwiR29BZ2VudFwiLFwicnVsZUxpc3RBdXRvUHJveHlcIjpmYWxzZSxcInN3aXRjaFJ1bGVzXCI6dHJ1ZSxcInJ1bGVMaXN0RW5hYmxlZFwiOmZhbHNlLFwicGFjU2NyaXB0RGF0YVwiOlwiXCIsXCJwcm94eVNlcnZlclwiOlwiXCIsXCJxdWlja1N3aXRjaFwiOmZhbHNlLFwicXVpY2tTd2l0Y2hUeXBlXCI6XCJiaW5hcnlcIixcInJlYXBwbHlTZWxlY3RlZFByb2ZpbGVcIjp0cnVlLFwiY29uZmlybURlbGV0aW9uXCI6ZmFsc2UsXCJydWxlc0ZpcnN0VGltZVwiOlwiO11cIixcIm1vbml0b3JQcm94eUNoYW5nZXNcIjpmYWxzZSxcInByZXZlbnRQcm94eUNoYW5nZXNcIjpmYWxzZSxcImxhc3RMaXN0VXBkYXRlXCI6XCJGcmkgU2VwIDE5IDIwMTQgMTQ6NDk6NDkgR01UKzA4MDAgKOS4reWbveagh+WHhuaXtumXtClcIixcInJlZnJlc2hUYWJcIjpmYWxzZSxcInN0YXJ0dXBQcm9maWxlSWRcIjpcImF1dG9cIixcInF1aWNrUnVsZVByb2ZpbGVJZFwiOlwiR29BZ2VudFwiLFwicXVpY2tSdWxlUGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm94eUNvbmZpZ1VybFwiOlwiOm1lbW9yeTpcIn0iLCJkZWZhdWx0UnVsZSI6IntcImlkXCI6XCJkZWZhdWx0UnVsZVwiLFwibmFtZVwiOlwiRGVmYXVsdCBSdWxlXCIsXCJ1cmxQYXR0ZXJuXCI6XCJcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJkaXJlY3RcIn0iLCJwcm9maWxlcyI6IntcIkFwYWNoZVwiOntcIm5hbWVcIjpcIkFwYWNoZVwiLFwicHJveHlNb2RlXCI6XCJtYW51YWxcIixcInByb3h5SHR0cFwiOlwiMTEzLjEwLjE2Ny4yODo4MDgwXCIsXCJ1c2VTYW1lUHJveHlcIjp0cnVlLFwicHJveHlIdHRwc1wiOlwiXCIsXCJwcm94eUZ0cFwiOlwiXCIsXCJwcm94eVNvY2tzXCI6XCJcIixcInNvY2tzVmVyc2lvblwiOjQsXCJwcm94eUV4Y2VwdGlvbnNcIjpcImxvY2FsaG9zdDsgMTI3LjAuMC4xOyA8bG9jYWw+XCIsXCJwcm94eUNvbmZpZ1VybFwiOlwiXCIsXCJjb2xvclwiOlwiYmx1ZVwiLFwiaWRcIjpcIkFwYWNoZVwifSxcIkdvQWdlbnRcIjp7XCJuYW1lXCI6XCJHQUVcIixcInByb3h5TW9kZVwiOlwibWFudWFsXCIsXCJwcm94eUh0dHBcIjpcIjExMy4xMC4xNjcuMjg6ODA4OFwiLFwidXNlU2FtZVByb3h5XCI6dHJ1ZSxcInByb3h5SHR0cHNcIjpcIlwiLFwicHJveHlGdHBcIjpcIlwiLFwicHJveHlTb2Nrc1wiOlwiXCIsXCJzb2Nrc1ZlcnNpb25cIjo0LFwicHJveHlFeGNlcHRpb25zXCI6XCJsb2NhbGhvc3Q7IDEyNy4wLjAuMTsgPGxvY2FsPlwiLFwicHJveHlDb25maWdVcmxcIjpcIlwiLFwiY29sb3JcIjpcImJsdWVcIixcImlkXCI6XCJHb0FnZW50XCJ9LFwicGFjXCI6e1wibmFtZVwiOlwiR0FFIFBBQ1wiLFwicHJveHlNb2RlXCI6XCJhdXRvXCIsXCJwcm94eUh0dHBcIjpcIlwiLFwidXNlU2FtZVByb3h5XCI6dHJ1ZSxcInByb3h5SHR0cHNcIjpcIlwiLFwicHJveHlGdHBcIjpcIlwiLFwicHJveHlTb2Nrc1wiOlwiXCIsXCJzb2Nrc1ZlcnNpb25cIjo0LFwicHJveHlFeGNlcHRpb25zXCI6XCJsb2NhbGhvc3Q7IDEyNy4wLjAuMTsgPGxvY2FsPlwiLFwicHJveHlDb25maWdVcmxcIjpcImh0dHA6Ly8xMTMuMTAuMTY3LjI4OjgwODYvcHJveHkucGFjXCIsXCJjb2xvclwiOlwiYmx1ZVwiLFwiaWRcIjpcInBhY1wifSxcIlNxdWlkIFNcIjp7XCJuYW1lXCI6XCJTcXVpZFwiLFwicHJveHlNb2RlXCI6XCJtYW51YWxcIixcInByb3h5SHR0cFwiOlwiMTczLjI1Mi4yMDEuNTU6MzEyOFwiLFwidXNlU2FtZVByb3h5XCI6dHJ1ZSxcInByb3h5SHR0cHNcIjpcIlwiLFwicHJveHlGdHBcIjpcIlwiLFwicHJveHlTb2Nrc1wiOlwiXCIsXCJzb2Nrc1ZlcnNpb25cIjo0LFwicHJveHlFeGNlcHRpb25zXCI6XCJsb2NhbGhvc3Q7IDEyNy4wLjAuMTsgPGxvY2FsPlwiLFwicHJveHlDb25maWdVcmxcIjpcIlwiLFwiY29sb3JcIjpcImJsdWVcIixcImlkXCI6XCJTcXVpZCBTXCJ9LFwiU3F1aWRcIjp7XCJuYW1lXCI6XCJTdHVubmVsXCIsXCJwcm94eU1vZGVcIjpcIm1hbnVhbFwiLFwicHJveHlIdHRwXCI6XCIxODIuOTIuMTgwLjM2OjcwNzFcIixcInVzZVNhbWVQcm94eVwiOnRydWUsXCJwcm94eUh0dHBzXCI6XCJcIixcInByb3h5RnRwXCI6XCJcIixcInByb3h5U29ja3NcIjpcIlwiLFwic29ja3NWZXJzaW9uXCI6NCxcInByb3h5RXhjZXB0aW9uc1wiOlwibG9jYWxob3N0OyAxMjcuMC4wLjE7IDxsb2NhbD5cIixcInByb3h5Q29uZmlnVXJsXCI6XCJcIixcImNvbG9yXCI6XCJibHVlXCIsXCJpZFwiOlwiU3F1aWRcIn0sXCJUdW5uZWxpZXIgV2luU2VydmVyXCI6e1wibmFtZVwiOlwiVHVubmVsaWVyXCIsXCJwcm94eU1vZGVcIjpcIm1hbnVhbFwiLFwicHJveHlIdHRwXCI6XCIxMTMuMTAuMTY3LjI4OjEwODBcIixcInVzZVNhbWVQcm94eVwiOnRydWUsXCJwcm94eUh0dHBzXCI6XCJcIixcInByb3h5RnRwXCI6XCJcIixcInByb3h5U29ja3NcIjpcIlwiLFwic29ja3NWZXJzaW9uXCI6NCxcInByb3h5RXhjZXB0aW9uc1wiOlwibG9jYWxob3N0OyAxMjcuMC4wLjE7IDxsb2NhbD5cIixcInByb3h5Q29uZmlnVXJsXCI6XCJcIixcImNvbG9yXCI6XCJibHVlXCIsXCJpZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwifSxcIlR1bm5lbGllclwiOntcIm5hbWVcIjpcIlR1bm5lbGllciBMb2NhbFwiLFwicHJveHlNb2RlXCI6XCJtYW51YWxcIixcInByb3h5SHR0cFwiOlwiMTI3LjAuMC4xOjEwODBcIixcInVzZVNhbWVQcm94eVwiOnRydWUsXCJwcm94eUh0dHBzXCI6XCJcIixcInByb3h5RnRwXCI6XCJcIixcInByb3h5U29ja3NcIjpcIlwiLFwic29ja3NWZXJzaW9uXCI6NCxcInByb3h5RXhjZXB0aW9uc1wiOlwibG9jYWxob3N0OyAxMjcuMC4wLjE7IDxsb2NhbD5cIixcInByb3h5Q29uZmlnVXJsXCI6XCJcIixcImNvbG9yXCI6XCJibHVlXCIsXCJpZFwiOlwiVHVubmVsaWVyXCJ9fSIsInF1aWNrU3dpdGNoUHJvZmlsZXMiOiJbXCJkaXJlY3RcIl0iLCJydWxlcyI6IntcImZhY2Vib29rXCI6e1wibmFtZVwiOlwiZmFjZWJvb2tcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmZhY2Vib29rLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwiLFwiaWRcIjpcImZhY2Vib29rXCJ9LFwiTmV3IFJ1bGUzXCI6e1wibmFtZVwiOlwiZ29vZ2xlXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vKi5nb29nbGUuY29tLiovKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIlR1bm5lbGllciBXaW5TZXJ2ZXJcIixcImlkXCI6XCJOZXcgUnVsZTNcIn0sXCJOZXcgUnVsZTJcIjp7XCJuYW1lXCI6XCJnb29nbGVcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmdvb2dsZS5jb20vKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIlR1bm5lbGllciBXaW5TZXJ2ZXJcIixcImlkXCI6XCJOZXcgUnVsZTJcIn0sXCJOZXcgUnVsZTVcIjp7XCJuYW1lXCI6XCJnb29nbGUgYW5hbHl0aWNzXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vKi5nb29nbGUtYW5hbHl0aWNzLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwiLFwiaWRcIjpcIk5ldyBSdWxlNVwifSxcIk5ldyBSdWxlNlwiOntcIm5hbWVcIjpcImdvb2dsZSBhcGlzXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vKi5nb29nbGVhcGlzLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwiLFwiaWRcIjpcIk5ldyBSdWxlNlwifSxcIk5ldyBSdWxlXCI6e1wibmFtZVwiOlwiZ29vZ2xlIGNvZGVcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmdvb2dsZWNvZGUuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJUdW5uZWxpZXIgV2luU2VydmVyXCIsXCJpZFwiOlwiTmV3IFJ1bGVcIn0sXCJOZXcgUnVsZTRcIjp7XCJuYW1lXCI6XCJnb29nbGUgdXNlcmNvbnRlbnRcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmdvb2dsZXVzZXJjb250ZW50LmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwiLFwiaWRcIjpcIk5ldyBSdWxlNFwifSxcIlF1aWNrIFJ1bGUgNlwiOntcIm5hbWVcIjpcImdzdGF0aWNcIixcInVybFBhdHRlcm5cIjpcIio6Ly8qLmdzdGF0aWMuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJUdW5uZWxpZXIgV2luU2VydmVyXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSA2XCJ9LFwiUXVpY2sgUnVsZSAzXCI6e1wibmFtZVwiOlwiUXVpY2sgUnVsZSAzXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vd3d3LmdtYWlsLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwiLFwiaWRcIjpcIlF1aWNrIFJ1bGUgM1wifSxcIlF1aWNrIFJ1bGUgNFwiOntcIm5hbWVcIjpcIlF1aWNrIFJ1bGUgNFwiLFwidXJsUGF0dGVyblwiOlwiKjovL2Nocm9tZS5nb29nbGUuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJUdW5uZWxpZXIgV2luU2VydmVyXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSA0XCJ9LFwiUXVpY2sgUnVsZSA1XCI6e1wibmFtZVwiOlwiUXVpY2sgUnVsZSA1XCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vc2l0ZXMuZ29vZ2xlLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwiLFwiaWRcIjpcIlF1aWNrIFJ1bGUgNVwifSxcIlF1aWNrIFJ1bGUgN1wiOntcIm5hbWVcIjpcIlF1aWNrIFJ1bGUgN1wiLFwidXJsUGF0dGVyblwiOlwiKjovLyouZ29vZ2xlZ3JvdXBzLmNvbS8qXCIsXCJwYXR0ZXJuVHlwZVwiOlwid2lsZGNhcmRcIixcInByb2ZpbGVJZFwiOlwiVHVubmVsaWVyIFdpblNlcnZlclwiLFwiaWRcIjpcIlF1aWNrIFJ1bGUgN1wifSxcImdvby5nbFwiOntcIm5hbWVcIjpcInNob3J0IGxpbmtcIixcInVybFBhdHRlcm5cIjpcIio6Ly9nb28uZ2wvKlwiLFwicGF0dGVyblR5cGVcIjpcIndpbGRjYXJkXCIsXCJwcm9maWxlSWRcIjpcIlR1bm5lbGllciBXaW5TZXJ2ZXJcIixcImlkXCI6XCJnb28uZ2xcIn0sXCJRdWljayBSdWxlIFwiOntcIm5hbWVcIjpcInQuY29cIixcInVybFBhdHRlcm5cIjpcIio6Ly90LmNvLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJUdW5uZWxpZXIgV2luU2VydmVyXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSBcIn0sXCJRdWljayBSdWxlIDJcIjp7XCJuYW1lXCI6XCJ0d2luZ1wiLFwidXJsUGF0dGVyblwiOlwiKjovLyoudHdpbWcuY29tLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJUdW5uZWxpZXIgV2luU2VydmVyXCIsXCJpZFwiOlwiUXVpY2sgUnVsZSAyXCJ9LFwiTmV3IFJ1bGU4XCI6e1wibmFtZVwiOlwid2lraXBlZGlhXCIsXCJ1cmxQYXR0ZXJuXCI6XCIqOi8vKi53aWtpcGVkaWEub3JnLypcIixcInBhdHRlcm5UeXBlXCI6XCJ3aWxkY2FyZFwiLFwicHJvZmlsZUlkXCI6XCJUdW5uZWxpZXIgV2luU2VydmVyXCIsXCJpZFwiOlwiTmV3IFJ1bGU4XCJ9fSIsInNlbGVjdGVkUHJvZmlsZSI6IntcIm5hbWVcIjpcIlvoh6rliqjliIfmjaJdXCIsXCJwcm94eU1vZGVcIjpcImF1dG9cIixcInByb3h5SHR0cFwiOlwiXCIsXCJ1c2VTYW1lUHJveHlcIjp0cnVlLFwicHJveHlIdHRwc1wiOlwiXCIsXCJwcm94eUZ0cFwiOlwiXCIsXCJwcm94eVNvY2tzXCI6XCJcIixcInNvY2tzVmVyc2lvblwiOjQsXCJwcm94eUV4Y2VwdGlvbnNcIjpcIlwiLFwicHJveHlDb25maWdVcmxcIjpcIjptZW1vcnk6XCIsXCJjb2xvclwiOlwiYXV0by1ibHVlXCIsXCJpZFwiOlwiYXV0b1wiLFwiaXNBdXRvbWF0aWNNb2RlUHJvZmlsZVwiOnRydWV9In0=';
        restoreBase64JsonM(backupData);
    }
}

function openOptions(firstTime) {
    var url = "options.html";
    if (firstTime)
        url += "?firstTime=true";

    var fullUrl = chrome.extension.getURL(url);
    chrome.tabs.getAllInWindow(null, function (tabs) {
        for (var i in tabs) { // check if Options page is open already
            if (tabs.hasOwnProperty(i)) {
                var tab = tabs[i];
                if (tab.url == fullUrl) {
                    chrome.tabs.update(tab.id, { selected:true }); // select the tab
                    return;
                }
            }
        }
        chrome.tabs.getSelected(null, function (tab) { // open a new tab next to currently selected tab
            chrome.tabs.create({
                url:url,
                index:tab.index + 1
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
        chrome.browserAction.setPopup({ popup:'' });
    } else {
        chrome.browserAction.setPopup({ popup:'popup.html' });
    }
}

function setIconBadge(text) {
    if (text == undefined)
        text = "";

    //chrome.browserAction.setBadgeBackgroundColor({ color: [75, 125, 255, 255] });
    chrome.browserAction.setBadgeBackgroundColor({ color:[90, 180, 50, 255] });
    chrome.browserAction.setBadgeText({ text:text });
}

function setIconTitle(title) {
    if (title == undefined)
        title = "";
    title = App.name;    
    chrome.browserAction.setTitle({ title:title });
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
        chrome.browserAction.setIcon({ path:iconInactivePath });
        title += profile.name;
    } else {
        var iconPath = iconDir + "icon-" + (profile.color || "blue") + ".png";
        chrome.browserAction.setIcon({ path:iconPath });
        title += ProfileManager.profileToString(profile, true);
    }

    setIconTitle(title);
}

RuleManager.LastProfile = null;

function setAutoSwitchIcon(url) {
    if (!RuleManager.isAutomaticModeEnabled(undefined))
        return false;

    if (url == undefined) {
        chrome.tabs.getSelected(undefined, function (tab) {
            setAutoSwitchIcon(tab.url);
        });
        return true;
    }

    RuleManager.getProfileByUrl(url, function(profile){
        RuleManager.LastProfile = profile;
        var iconPath = iconDir + "icon-auto-" + (profile.color || "blue") + ".png";

        chrome.browserAction.setIcon({ path:iconPath });


        var title = I18n.getMessage("proxy_autoSwitchIconTitle", profile.name);

        setIconTitle(title);
    });
    return true;
}

function monitorTabChanges() {
    chrome.tabs.onSelectionChanged.addListener(function (tabId) {
        chrome.tabs.get(tabId, function (tab) {
            setAutoSwitchIcon(tab.url);
        });
    });
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo.status == "complete") {
            chrome.tabs.getSelected(null, function (selectedTab) {
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

$(document).ready(function(){
    init();
});
