// ==UserScript==
// @name         YouTube 聊天室實名修正 (安全連動版)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  從父視窗安全獲取 API Key，不將 Key 上傳至 GitHub
// @author       Anshaer
// @match        https://www.youtube.com/live_chat*
// @grant        GM_xmlhttpRequest
// @connect      www.googleapis.com
// ==/UserScript==

(function() {
    'use strict';

    let API_KEY = "";
    const nameCache = new Map();

    // 關鍵：嘗試從父視窗抓取 Key
    function getApiKey() {
        try {
            // 嘗試讀取父視窗存放在 localStorage 的 Key
            // 如果瀏覽器報 CORS 錯誤，則需手動在網頁輸入
            return window.parent.localStorage.getItem('yt_api_key') || "";
        } catch (e) {
            console.warn("無法存取父視窗記憶體，請檢查網域設定");
            return "";
        }
    }

    function fetchRealName(handle, element) {
        if (!API_KEY) API_KEY = getApiKey();
        if (!API_KEY) return; // 沒 Key 就不動

        if (nameCache.has(handle)) {
            applyName(element, handle, nameCache.get(handle));
            return;
        }

        const cleanHandle = handle.replace('@', '');
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${cleanHandle}&key=${API_KEY}`,
            onload: function(res) {
                const data = JSON.parse(res.responseText);
                if (data.items && data.items.length > 0) {
                    const realName = data.items[0].snippet.title;
                    nameCache.set(handle, realName);
                    applyName(element, handle, realName);
                }
            }
        });
    }

    function applyName(el, handle, name) {
        if (!el.dataset.renamed) {
            el.innerText = `${name} (${handle})`;
            el.style.color = "#ffca28"; 
            el.dataset.renamed = "true";
        }
    }

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
        } else {
            setTimeout(init, 1000);
        }
    };
    init();
})();
