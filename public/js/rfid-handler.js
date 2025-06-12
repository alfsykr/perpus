// RFID Handler untuk integrasi dengan Firebase
let currentRFID = null;

function setupRFIDListener() {
  const rfidRef = firebase.database().ref("current_rfid");

  rfidRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && data.uid && data.uid !== currentRFID) {
      currentRFID = data.uid;
      document.getElementById("borrowUID").value = data.uid;
      verifyBorrowUID();

      // Feedback visual
      const statusElement = document.getElementById("borrowRfidStatus");
      statusElement.textContent = "Status: Memproses UID...";
      statusElement.style.color = "#4CAF50";

      setTimeout(() => {
        statusElement.style.color = "";
      }, 2000);
    }
  });
}

// Panggil saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  setupRFIDListener();
});

// Fungsi verifikasi UID yang sudah ada di app.js, tapi diperbarui
async function verifyBorrowUID() {
  const uid = document.getElementById("borrowUID").value.trim();
  const statusElement = document.getElementById("borrowRfidStatus");

  if (uid.length < 8) {
    statusElement.textContent = "Status: UID terlalu pendek";
    statusElement.style.color = "#f44336";
    return;
  }

  try {
    statusElement.textContent = "Status: Memverifikasi...";
    statusElement.style.color = "#FFC107";

    const membersRef = firebase.database().ref("Members");
    const snapshot = await membersRef
      .orderByChild("uid")
      .equalTo(uid)
      .once("value");

    if (snapshot.exists()) {
      const memberData = Object.values(snapshot.val())[0];
      const memberId = Object.keys(snapshot.val())[0];

      statusElement.textContent = `Status: Valid - ${memberData.name}`;
      statusElement.style.color = "#4CAF50";

      document
        .getElementById("borrowSectionContent")
        .classList.remove("hidden");
      document.getElementById("borrowMemberDetails").innerHTML = `
        <strong>${memberData.name}</strong><br>
        Email: ${memberData.email || "-"}<br>
        Tipe: ${memberData.type || "-"}
      `;

      // Simpan memberId untuk proses peminjaman
      document.getElementById("borrowSectionContent").dataset.memberId =
        memberId;
    } else {
      statusElement.textContent = "Status: Anggota tidak ditemukan";
      statusElement.style.color = "#f44336";
      document.getElementById("borrowSectionContent").classList.add("hidden");
    }
  } catch (error) {
    statusElement.textContent = "Status: Error memverifikasi";
    statusElement.style.color = "#f44336";
    console.error("Error verifying UID:", error);
  }
}
