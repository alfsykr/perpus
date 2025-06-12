const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Log RFID scan
exports.logRFIDScan = functions.database
  .ref("/current_rfid/{uid}")
  .onCreate((snapshot, context) => {
    const rfidData = snapshot.val();

    return admin.database().ref("rfid_logs").push({
      uid: rfidData.uid,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      status: "scanned",
    });
  });

// Verifikasi anggota via HTTP request
exports.verifyMember = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Hanya POST yang diizinkan" });
  }

  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "UID diperlukan" });
  }

  try {
    const snapshot = await admin
      .database()
      .ref("Members")
      .orderByChild("uid")
      .equalTo(uid)
      .once("value");

    if (snapshot.exists()) {
      const memberData = snapshot.val();
      return res.json({
        valid: true,
        member: Object.values(memberData)[0],
      });
    } else {
      return res.json({ valid: false });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
