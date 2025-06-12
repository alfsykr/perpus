let currentRFID = null;

function setupRFIDListener() {
  const rfidRef = firebase.database().ref("current_rfid");

  rfidRef.on("value", async (snapshot) => {
    const data = snapshot.val();
    if (data && data.uid && data.uid !== currentRFID) {
      currentRFID = data.uid;

      // Jika berada di halaman Peminjaman
      const borrowSection = document.getElementById("borrow-section");
      if (borrowSection && !borrowSection.classList.contains("hidden")) {
        document.getElementById("borrowUID").value = data.uid;
        await verifyBorrowUID();
      }

      // Jika berada di halaman Pengembalian
      const returnSection = document.getElementById("return-section");
      if (returnSection && !returnSection.classList.contains("hidden")) {
        document.getElementById("returnUID").value = data.uid;
        loadMemberForReturn();
      }

      // Feedback visual
      const statusElement = document.getElementById("borrowRfidStatus");
      if (statusElement) {
        statusElement.textContent = "Status: Memproses UID...";
        statusElement.style.color = "#4CAF50";
        setTimeout(() => (statusElement.style.color = ""), 2000);
      }

      // Reset UID agar bisa tap kartu berikutnya
      setTimeout(() => {
        firebase.database().ref("current_rfid").set({});
        currentRFID = null;
      }, 2000);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupRFIDListener();
});
