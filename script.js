import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/*
  請把 Firebase Console 裡的 Web App config 貼到這裡。
*/
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const blessingsRef = collection(db, "blessings");

const form = document.querySelector("#blessingForm");
const nameInput = document.querySelector("#name");
const messageInput = document.querySelector("#message");
const charCount = document.querySelector("#charCount");
const formStatus = document.querySelector("#formStatus");
const submitBtn = document.querySelector("#submitBtn");
const blessingList = document.querySelector("#blessingList");
const refreshBtn = document.querySelector("#refreshBtn");

const SUBMITTED_KEY = "blessingBottleSubmitted";

function setStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = `status ${type}`;
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleString("zh-Hant", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function checkAlreadySubmitted() {
  const submitted = localStorage.getItem(SUBMITTED_KEY) === "true";
  if (submitted) {
    submitBtn.disabled = true;
    setStatus("這部裝置已經提交過一次祝福。謝謝你！", "ok");
  }
}

async function loadBlessings() {
  blessingList.innerHTML = `<p class="empty">正在載入祝福……</p>`;

  try {
    const q = query(blessingsRef, orderBy("createdAt", "desc"), limit(80));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      blessingList.innerHTML = `<p class="empty">暫時未有祝福，成為第一個送出祝福的人吧。</p>`;
      return;
    }

    blessingList.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement("article");
      card.className = "blessing-card";
      card.innerHTML = `
        <p class="blessing-message">${escapeHTML(data.message)}</p>
        <p class="blessing-name">— ${escapeHTML(data.name)}</p>
        <p class="blessing-date">${formatDate(data.createdAt)}</p>
      `;
      blessingList.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    blessingList.innerHTML = `<p class="empty">載入失敗，請檢查 Firebase 設定。</p>`;
  }
}

messageInput.addEventListener("input", () => {
  charCount.textContent = messageInput.value.length;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (localStorage.getItem(SUBMITTED_KEY) === "true") {
    setStatus("這部裝置已經提交過一次祝福。", "error");
    return;
  }

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!name || !message) {
    setStatus("請填寫名字和祝福語。", "error");
    return;
  }

  if (message.length > 160) {
    setStatus("祝福語太長，請控制在 160 字內。", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("正在把祝福放入漂流瓶……", "");

  try {
    await addDoc(blessingsRef, {
      name,
      message,
      createdAt: serverTimestamp()
    });

    localStorage.setItem(SUBMITTED_KEY, "true");
    form.reset();
    charCount.textContent = "0";
    setStatus("祝福已送出！你可以在下方看到大家的祝福。", "ok");
    await loadBlessings();
  } catch (error) {
    console.error(error);
    submitBtn.disabled = false;
    setStatus("送出失敗，請檢查 Firebase 設定或網絡連線。", "error");
  }
});

refreshBtn.addEventListener("click", loadBlessings);

checkAlreadySubmitted();
loadBlessings();
