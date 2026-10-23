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
    if (btn) { btn.textContent = label; btn.onclick = onClick; return; }
    btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:10000;background:#03A84E;color:#fff;border:none;border-radius:999px;padding:12px 18px;font-size:14.5px;font-weight:700;box-shadow:0 8px 22px rgba(0,0,0,.28);cursor:pointer;font-family:inherit";
    btn.onclick = onClick;
    document.body.appendChild(btn);
  }
  function hideBtn() { if (btn) { try { btn.remove(); } catch (e) {} btn = null; } }

  function refresh() {
    if (!token()) { hideBtn(); return; }
    if (!pushSupported) {
      // iPhone chưa cài web vào Màn hình chính thì chưa nhận được đẩy — hướng dẫn khách.
      if (isIOS && !standalone) {
        showBtn("🔔 Nhận thông báo đơn hàng", function () {
          toast("Trên iPhone: bấm nút Chia sẻ (⬆️) ở Safari → 'Thêm vào Màn hình chính', rồi mở web từ biểu tượng đó và bật thông báo nhé.");
        });
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
