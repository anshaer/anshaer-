// ==UserScript==
// @name         YouTube 聊天室實名修正 (Iframe 快取版)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  偵測 @ID 並補上頻道名稱，極省點數
// @author       Anshaer
// @match        https://www.youtube.com/live_chat*
// @grant        GM_xmlhttpRequest
// @connect      www.googleapis.com
// ==/UserScript==

(function() {
    'use strict';

    let API_KEY = localStorage.getItem('yt_api_key');
    const nameCache = new Map();

    // 真正的實名查詢 (消耗 1 點)
    function fetchRealName(handle, element) {
        // 如果讀不到 Key，嘗試從父層網頁拿
        if (!API_KEY) API_KEY = window.parent.localStorage.getItem('yt_api_key');
        if (!API_KEY) return;

        // 檢查快取 (省點數核心)
        if (nameCache.has(handle)) {
            applyName(element, handle, nameCache.get(handle));
            return;
        }

        const cleanHandle = handle.replace('@', '');
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${cleanHandle}&key=${API_KEY}`,
            onload: function(res) {
                try {
                    const data = JSON.parse(res.responseText);
                    if (data.items && data.items.length > 0) {
                        const realName = data.items[0].snippet.title;
                        nameCache.set(handle, realName); // 存入快取
                        applyName(element, handle, realName);
                    }
                } catch(e) {}
            }
        });
    }

    function applyName(el, handle, name) {
        if (!el.dataset.renamed) {
            el.innerText = `${name} (${handle})`;
            el.style.color = "#ffca28"; // 黃色區分
            el.dataset.renamed = "true";
        }
    }

    // 監控聊天室新留言
    const observer = new MutationObserver((mutations) => {
        for (let m of mutations) {
            for (let node of m.addedNodes) {
                if (node.nodeType === 1) {
                    const author = node.querySelector('#author-name');
                    if (author && author.innerText.startsWith('@')) {
                        fetchRealName(author.innerText.trim(), author);
                    }
                }
            }
        }
    });

    const init = () => {
        const container = document.querySelector('#items.yt-live-chat-item-list-renderer');
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
            console.log("實名腳本已就緒");
        } else {
            setTimeout(init, 1000);
        }
    };
    init();
})();
