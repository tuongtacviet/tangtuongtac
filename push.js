// Việt Tương Tác — Thông báo đẩy (Web Push) phía khách.
// Đăng ký service worker, mời khách đã đăng nhập bật thông báo,
// gửi đăng ký lên Worker gắn với tài khoản (ttt_token).
(function () {
  var API = "https://smm-proxy.hungcuonghnhm.workers.dev";
  function token() { try { return localStorage.getItem("ttt_token"); } catch (e) { return null; } }
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  var pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:#14532d;color:#fff;padding:11px 18px;border-radius:12px;font-size:14.5px;z-index:10001;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:88vw;text-align:center";
    document.body.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 4200);
  }

  function urlB64ToU8(b64) {
    var pad = "=".repeat((4 - (b64.length % 4)) % 4);
    var base = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(base);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  // Bảng hướng dẫn iPhone: iOS chỉ nhận đẩy khi web đã cài ra Màn hình chính.
  // Bảng đứng yên tới khi khách tự đóng (thay toast 4 giây đọc không kịp).
  var guide = null;
  function ico(paths) {
    return '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:3px">' + paths + '</svg>';
  }
  function stepRow(n, icon, html) {
    return '<div style="display:flex;gap:11px;align-items:flex-start;margin:0 0 13px">' +
      '<div style="flex:none;width:29px;height:29px;border-radius:50%;background:#03A84E;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px;margin-top:1px">' + n + '</div>' +
      icon +
      '<div style="font-size:15px;line-height:1.55;color:#e2e8f0;padding-top:3px">' + html + '</div></div>';
  }
  function showIosGuide() {
    if (guide) { guide.style.display = "flex"; return; }
    guide = document.createElement("div");
    guide.style.cssText = "position:fixed;inset:0;background:rgba(3,7,15,.78);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px";
    guide.innerHTML =
      '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:18px;max-width:420px;width:100%;padding:24px 20px 18px;color:#e2e8f0;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.5);max-height:88vh;overflow:auto">' +
      '<button type="button" aria-label="Đóng" data-close="1" style="position:absolute;top:8px;right:10px;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;line-height:1;padding:4px">&times;</button>' +
      '<h3 style="margin:0 26px 8px 0;font-size:18.5px;color:#4ade80;line-height:1.35">📲 Nhận thông báo trên iPhone</h3>' +
      '<p style="margin:0 0 15px;font-size:14.5px;line-height:1.55;color:#cbd5e1">iPhone cần cài web ra màn hình chính 1 lần mới nhận được thông báo đẩy. <b style="color:#fff">Làm 1 lần — dùng mãi mãi:</b> đơn xong, nạp ví, khuyến mãi báo ngay về máy bạn.</p>' +
      stepRow(1, ico('<path d="M12 15V4"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'), 'Bấm nút <b>Chia sẻ</b> ở thanh công cụ dưới cùng của Safari') +
      stepRow(2, ico('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/>'), 'Cuộn xuống, chọn <b>“Thêm vào Màn hình chính”</b> rồi bấm <b>Thêm</b>') +
      stepRow(3, ico('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>'), 'Mở lại <b>Việt Tương Tác</b> từ biểu tượng vừa tạo ngoài màn hình chính, bấm nút chuông và chọn <b>Cho phép</b>') +
      '<button type="button" data-close="1" style="width:100%;background:#03A84E;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15.5px;font-weight:700;cursor:pointer;margin-top:4px">Đã hiểu, để tôi làm ngay</button>' +
      '</div>';
    guide.addEventListener("click", function (e) {
      if (e.target === guide || e.target.getAttribute("data-close")) guide.style.display = "none";
    });
    document.body.appendChild(guide);
  }

  function sendSub(sub) {
    return fetch(API + "/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token() },
      body: JSON.stringify({ subscription: sub })
    });
  }

  function ensureSubscribed() {
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub) return sendSub(sub);
        return fetch(API + "/api/push/public-key").then(function (r) { return r.json(); }).then(function (d) {
          if (!d || !d.key) throw new Error("no key");
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(d.key) }).then(sendSub);
        });
      });
    });
  }

  var btn = null;
  var lastSync = 0;
  function showBtn(label, onClick) {
    // Nut chuong dang pill CO CHU nhung gon: chu nho 12.5px, padding mong,
    // z-index 50 < modal dat don (60) nen khong de len nut Dat don (Quang chot 23/10).
    if (btn) { btn.textContent = label; btn.title = label; btn.setAttribute("aria-label", label); btn.onclick = onClick; return; }
    btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:50;background:#03A84E;color:#fff;border:none;border-radius:999px;padding:8px 13px;font-size:12.5px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer;font-family:inherit;white-space:nowrap";
    btn.onclick = onClick;
    document.body.appendChild(btn);
  }
  function hideBtn() { if (btn) { try { btn.remove(); } catch (e) {} btn = null; } }

  function refresh() {
    if (!token()) { hideBtn(); return; }
    if (!pushSupported) {
      // iPhone chưa cài web vào Màn hình chính thì chưa nhận được đẩy — hướng dẫn khách.
      if (isIOS && !standalone) {
        showBtn("🔔 Nhận thông báo đơn hàng", showIosGuide);
      } else hideBtn();
      return;
    }
    if (Notification.permission === "denied") { hideBtn(); return; }
    if (Notification.permission === "granted") {
      hideBtn();
      if (Date.now() - lastSync > 300000) {
        lastSync = Date.now();
        ensureSubscribed().catch(function () {});
      }
      return;
    }
    // permission === "default": hiện nút mời bật
    showBtn("🔔 Bật thông báo đơn hàng", function () {
      Notification.requestPermission().then(function (p) {
        if (p === "granted") {
          lastSync = Date.now();
          ensureSubscribed().then(function () { hideBtn(); toast("Đã bật thông báo ✅ Bạn sẽ nhận tin khi đơn xong, nạp ví thành công và ưu đãi mới."); })
            .catch(function () { toast("Chưa bật được thông báo, bạn thử lại sau nhé."); });
        } else {
          hideBtn();
          toast("Bạn chưa cho phép thông báo. Khi cần, bật lại trong cài đặt trình duyệt nhé.");
        }
      });
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh);
  else refresh();
  setInterval(refresh, 6000);
})();
