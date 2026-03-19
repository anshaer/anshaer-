async function uploadToCloud(vrmData) {
  const scriptUrl = "https://script.google.com/macros/s/AKfycbx9y6ts9MZ2HAqQAdN0m8sspELGtfHaEKv3OepeTKhcs_wlwU_RtmPYCYm369T7Cj8iWQ/exec"; // 記得要部署為 Web App

  const payload = {
    userId: "Anshaer_01",
    action: "save_config",
    modelName: "MyAvatar.vrm",
    config: {
      eyeIntensity: 1.2,
      mouthOpenLimit: 0.8
    }
  };

  // 注意：GAS 的 POST 請求通常需要處理 CORS 問題
  // 在 GAS 中，最簡單的方式是使用 'no-cors' 或是確保回傳正確的 JSON 格式
  await fetch(scriptUrl, {
    method: "POST",
    mode: "no-cors", // 重要：GAS 跨域請求常用設定
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  alert("設定已同步至 Google Cloud (GAS)");
}
