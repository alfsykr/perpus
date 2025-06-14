
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1HKFjB7AZFLZ-P-iixMd9SdGA5njXN4c",
  authDomain: "e-perpus-13f02.firebaseapp.com",
  databaseURL: "https://e-perpus-13f02-default-rtdb.firebaseio.com",
  projectId: "e-perpus-13f02",
  storageBucket: "e-perpus-13f02.firebasestorage.app",
  messagingSenderId: "135325587497",
  appId: "1:135325587497:web:314f93fd9c72f16a8a2438",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentEditId = null;
let allBooks = {};
let allMembers = {};
let allTransactions = {};
let categoryChart = null;
let weeklyChart = null;

document.addEventListener("DOMContentLoaded", function () {
  loadData();
  initializeCharts();
  setupRFIDListener();
});

function loadData() {
  database.ref("Books").on("value", (snap) => {
    allBooks = snap.val() || {};
    displayBooks();
    updateBookOptions();
    updateDashboard();
    updateCategoryChart();
  });
  
  database.ref("Members").on("value", (snap) => {
    allMembers = snap.val() || {};
    displayMembers();
    updateDashboard();
  });
  
  database.ref("Transactions").on("value", (snap) => {
    allTransactions = snap.val() || {};
    updateDashboard();
    updateRecentActivities();
    updateWeeklyChart();
  });
}

function updateDashboard() {
  let totalBooks = 0;
  Object.values(allBooks).forEach((book) => {
    totalBooks += Number(book.stock || 0);
  });
  document.getElementById("totalBooks").textContent = totalBooks;
  document.getElementById("totalMembers").textContent = Object.keys(allMembers).length;

  let borrowedBooks = 0, overdueBooks = 0;
  const today = new Date().toISOString().slice(0, 10);
  Object.values(allTransactions).forEach((trx) => {
    if (trx.status === "borrowed") {
      borrowedBooks++;
      if (trx.dueDate && trx.dueDate < today) overdueBooks++;
    }
  });
  document.getElementById("borrowedBooks").textContent = borrowedBooks;
  document.getElementById("overdueBooks").textContent = overdueBooks;
}

function displayBooks() {
  const booksList = document.getElementById("booksList");
  const search = (document.getElementById("bookSearch")?.value || "").toLowerCase();
  booksList.innerHTML = "";
  
  Object.entries(allBooks).forEach(([id, book]) => {
    if (!search || 
        (book.title && book.title.toLowerCase().includes(search)) ||
        (book.author && book.author.toLowerCase().includes(search)) ||
        (book.category && book.category.toLowerCase().includes(search))) {
      const status = book.stock > 0 ? "Tersedia" : "Terpinjam";
      const statusClass = book.stock > 0 ? "status-available" : "status-borrowed";
      booksList.innerHTML += `
        <div class="item-card">
          <strong>${book.title || ""}</strong> <span class="stock-info">Stok: ${book.stock || 0}</span>
          <div>
            <span class="status-badge ${statusClass}">${status}</span>
          </div>
          <div>
            <button class="btn" onclick="editBook('${id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="deleteBook('${id}')">🗑️ Hapus</button>
          </div>
        </div>
      `;
    }
  });
}

function searchBooks() {
  displayBooks();
}

function updateBookOptions() {
  const select = document.getElementById("borrowBookSelect");
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Buku --</option>';
  Object.entries(allBooks).forEach(([id, book]) => {
    if (book.stock > 0) {
      select.innerHTML += `<option value="${id}">${book.title} (Stok: ${book.stock})</option>`;
    }
  });
}

function displayMembers() {
  const membersList = document.getElementById("membersList");
  const search = (document.getElementById("memberSearch")?.value || "").toLowerCase();
  membersList.innerHTML = "";

  Object.entries(allMembers).forEach(([id, member]) => {
    if (!search ||
        (member.name && member.name.toLowerCase().includes(search)) ||
        (member.uid && member.uid.toLowerCase().includes(search)) ||
        (member.email && member.email.toLowerCase().includes(search)) ||
        (member.type && member.type.toLowerCase().includes(search))) {
      membersList.innerHTML += `
        <div class="item-card">
          <strong>${member.name || ""}</strong>
          <div>
            <span class="status-badge status-available">UID: ${member.uid || ""}</span>
            <span class="stock-info">Tipe: ${member.type || ""}</span>
          </div>
          <div>
            <small>Email: ${member.email || "-"}</small><br>
            <small>Telepon: ${member.phone || "-"}</small>
          </div>
          <div>
            <button class="btn" onclick="editMember('${id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="deleteMember('${id}')">🗑️ Hapus</button>
          </div>
        </div>
      `;
    }
  });

  if (membersList.innerHTML === "") {
    membersList.innerHTML = '<div class="item-card"><em>Tidak ada anggota yang ditemukan.</em></div>';
  }
}

function searchMembers() {
  displayMembers();
}

// CRUD Buku
document.getElementById("bookForm").onsubmit = function (e) {
  e.preventDefault();
  const data = {
    title: document.getElementById("bookTitle").value,
    author: document.getElementById("bookAuthor").value,
    publisher: document.getElementById("bookPublisher").value,
    year: document.getElementById("bookYear").value,
    isbn: document.getElementById("bookISBN").value,
    category: document.getElementById("bookCategory").value,
    stock: parseInt(document.getElementById("bookStock").value),
  };
  
  if (currentEditId) {
    database.ref("Books/" + currentEditId).update(data)
      .then(() => console.log("Book updated successfully"))
      .catch((error) => console.error("Error updating book:", error));
  } else {
    database.ref("Books").push(data)
      .then(() => console.log("Book added successfully"))
      .catch((error) => console.error("Error adding book:", error));
  }
  
  closeModal("bookModal");
  this.reset();
  currentEditId = null;
};

function editBook(id) {
  currentEditId = id;
  const book = allBooks[id];
  document.getElementById("bookModalTitle").textContent = "Edit Buku";
  document.getElementById("bookTitle").value = book.title || "";
  document.getElementById("bookAuthor").value = book.author || "";
  document.getElementById("bookPublisher").value = book.publisher || "";
  document.getElementById("bookYear").value = book.year || "";
  document.getElementById("bookISBN").value = book.isbn || "";
  document.getElementById("bookCategory").value = book.category || "Fiksi";
  document.getElementById("bookStock").value = book.stock || 1;
  showModal("bookModal");
}

function deleteBook(id) {
  if (confirm("Yakin ingin menghapus buku ini?")) {
    database.ref("Books/" + id).remove()
      .then(() => console.log("Book deleted successfully"))
      .catch((error) => console.error("Error deleting book:", error));
  }
}

// CRUD Anggota
document.getElementById("memberForm").onsubmit = function (e) {
  e.preventDefault();
  const data = {
    uid: document.getElementById("memberUID").value,
    name: document.getElementById("memberName").value,
    email: document.getElementById("memberEmail").value,
    phone: document.getElementById("memberPhone").value,
    address: document.getElementById("memberAddress").value,
    type: document.getElementById("memberType").value,
  };
  
  if (currentEditId) {
    database.ref("Members/" + currentEditId).update(data)
      .then(() => console.log("Member updated successfully"))
      .catch((error) => console.error("Error updating member:", error));
  } else {
    database.ref("Members").push(data)
      .then(() => console.log("Member added successfully"))
      .catch((error) => console.error("Error adding member:", error));
  }
  
  closeModal("memberModal");
  this.reset();
  currentEditId = null;
};

function editMember(id) {
  currentEditId = id;
  const member = allMembers[id];
  document.getElementById("memberModalTitle").textContent = "Edit Anggota";
  document.getElementById("memberUID").value = member.uid || "";
  document.getElementById("memberName").value = member.name || "";
  document.getElementById("memberEmail").value = member.email || "";
  document.getElementById("memberPhone").value = member.phone || "";
  document.getElementById("memberAddress").value = member.address || "";
  document.getElementById("memberType").value = member.type || "Mahasiswa";
  showModal("memberModal");
}

function deleteMember(id) {
  if (confirm("Yakin ingin menghapus anggota ini?")) {
    database.ref("Members/" + id).remove()
      .then(() => console.log("Member deleted successfully"))
      .catch((error) => console.error("Error deleting member:", error));
  }
}

// Modal helpers
function showModal(id) {
  document.getElementById(id).style.display = "block";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
  currentEditId = null;
  if (id === "bookModal") document.getElementById("bookForm").reset();
  if (id === "memberModal") document.getElementById("memberForm").reset();
  document.getElementById("bookModalTitle").textContent = "Tambah Buku";
  document.getElementById("memberModalTitle").textContent = "Tambah Anggota";
}

let selectedBooks = [];

function verifyBorrowUID() {
  const uid = document.getElementById("borrowUID").value.trim();
  const statusText = document.getElementById("borrowRfidStatus");
  const content = document.getElementById("borrowSectionContent");
  const memberDetails = document.getElementById("borrowMemberDetails");

  let found = false;

  Object.entries(allMembers).forEach(([id, member]) => {
    if (member.uid === uid) {
      found = true;
      statusText.textContent = `Status: UID ditemukan - ${member.name}`;
      content.classList.remove("hidden");
      memberDetails.innerHTML = `
        <strong>${member.name}</strong><br>
        Email: ${member.email || "-"}<br>
        Tipe: ${member.type || "-"}
      `;
    }
  });

  if (!found) {
    content.classList.add("hidden");
    memberDetails.innerHTML = "";
    statusText.textContent = "Status: UID tidak dikenali.";
  }
}

function selectBookForBorrow() {
  const bookId = document.getElementById("borrowBookSelect").value;
  if (!bookId || selectedBooks.includes(bookId)) return;

  if (selectedBooks.length >= 3) {
    alert("Maksimal 3 buku per peminjaman.");
    return;
  }

  const book = allBooks[bookId];
  if (!book || book.stock <= 0) {
    alert("Stok buku tidak tersedia.");
    return;
  }

  selectedBooks.push(bookId);

  const listItem = document.createElement("li");
  listItem.textContent = book.title;
  document.getElementById("selectedBooksList").appendChild(listItem);
}

function processBorrow() {
  const uid = document.getElementById("borrowUID").value.trim();

  if (!uid || selectedBooks.length === 0) {
    alert("Lengkapi data peminjaman!");
    return;
  }

  let memberId = null;
  let memberName = "";
  Object.entries(allMembers).forEach(([id, member]) => {
    if (member.uid === uid) {
      memberId = id;
      memberName = member.name;
    }
  });

  if (!memberId) {
    alert("Anggota tidak ditemukan!");
    return;
  }

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 7);
  const tanggalPinjam = today.toISOString().slice(0, 10);
  const tanggalJatuhTempo = dueDate.toISOString().slice(0, 10);

  let successCount = 0;

  selectedBooks.forEach((bookId) => {
    const book = allBooks[bookId];
    if (book && book.stock > 0) {
      const trxData = {
        memberId,
        memberName,
        bookId,
        bookTitle: book.title,
        borrowDate: tanggalPinjam,
        dueDate: tanggalJatuhTempo,
        status: "borrowed",
      };

      database.ref("Transactions").push(trxData)
        .then(() => {
          return database.ref("Books/" + bookId).update({
            stock: Number(book.stock) - 1,
          });
        })
        .then(() => {
          successCount++;
          console.log("Transaction processed successfully");
        })
        .catch((error) => {
          console.error("Error processing transaction:", error);
        });
    }
  });

  if (successCount > 0) {
    alert(`Peminjaman ${successCount} buku berhasil!`);
  } else {
    alert("Tidak ada buku yang berhasil dipinjam.");
  }

  resetBorrowForm();
}

function resetBorrowForm() {
  document.getElementById("borrowUID").value = "";
  document.getElementById("borrowRfidStatus").textContent = "Status: Menunggu tap kartu anggota...";
  document.getElementById("borrowSectionContent").classList.add("hidden");
  document.getElementById("borrowMemberDetails").innerHTML = "";
  document.getElementById("selectedBooksList").innerHTML = "";
  selectedBooks = [];
  document.getElementById("borrowBookSelect").selectedIndex = 0;
}

// Pengembalian
function loadMemberForReturn() {
  const uid = document.getElementById("returnUID").value;
  let memberId = null;
  Object.entries(allMembers).forEach(([id, member]) => {
    if (member.uid === uid) memberId = id;
  });
  
  const borrowedBooksList = document.getElementById("borrowedBooksList");
  borrowedBooksList.innerHTML = "";
  let found = false;
  
  Object.entries(allTransactions).forEach(([trxId, trx]) => {
    if (trx.memberId === memberId && trx.status === "borrowed") {
      found = true;
      const overdue = trx.dueDate < new Date().toISOString().slice(0, 10);
      const overdueClass = overdue ? "overdue" : "";
      borrowedBooksList.innerHTML += `
        <div class="transaction-item ${overdueClass}">
          <span>
            <strong>${trx.bookTitle}</strong>
            <br>
            <small>Jatuh tempo: ${trx.dueDate}</small>
          </span>
          <button class="btn btn-success" onclick="processReturn('${trxId}')">Kembalikan</button>
        </div>
      `;
    }
  });
  
  document.getElementById("returnMemberInfo").classList.toggle("hidden", !found);
  if (!found) borrowedBooksList.innerHTML = "<em>Tidak ada buku yang sedang dipinjam.</em>";
}

function processReturn(trxId) {
  database.ref("Transactions/" + trxId + "/status").set("returned")
    .then(() => {
      const trx = allTransactions[trxId];
      if (trx) {
        const book = allBooks[trx.bookId];
        if (book) {
          return database.ref("Books/" + trx.bookId).update({ 
            stock: Number(book.stock) + 1 
          });
        }
      }
    })
    .then(() => {
      alert("Pengembalian buku berhasil!");
      loadMemberForReturn();
    })
    .catch((error) => {
      console.error("Error processing return:", error);
      alert("Gagal memproses pengembalian!");
    });
}

// Charts
function initializeCharts() {
  const ctx1 = document.getElementById("categoryChart").getContext("2d");
  categoryChart = new Chart(ctx1, {
    type: "doughnut",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
  });
  
  const ctx2 = document.getElementById("weeklyChart").getContext("2d");
  weeklyChart = new Chart(ctx2, {
    type: "bar",
    data: {
      labels: [],
      datasets: [{ label: "Peminjaman", data: [], backgroundColor: "#667eea" }],
    },
  });
}

function updateCategoryChart() {
  const categoryCount = {};
  Object.values(allBooks).forEach((book) => {
    const cat = book.category || "Lainnya";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  
  categoryChart.data.labels = Object.keys(categoryCount);
  categoryChart.data.datasets[0].data = Object.values(categoryCount);
  categoryChart.data.datasets[0].backgroundColor = [
    "#6c5ce7", "#fdcb6e", "#00b894", "#00cec9", 
    "#d63031", "#e17055", "#0984e3", "#636e72",
  ];
  categoryChart.update();
}

function updateWeeklyChart() {
  const days = [];
  const counts = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("id-ID", { weekday: "short" });
    days.push(label);
    const dateStr = d.toISOString().slice(0, 10);
    let count = 0;
    Object.values(allTransactions).forEach((trx) => {
      if (trx.borrowDate === dateStr) count++;
    });
    counts.push(count);
  }
  
  weeklyChart.data.labels = days;
  weeklyChart.data.datasets[0].data = counts;
  weeklyChart.update();
}

function updateRecentActivities() {
  const container = document.getElementById("recentActivities");
  const sorted = Object.values(allTransactions).sort((a, b) =>
    (b.borrowDate || "").localeCompare(a.borrowDate || "")
  );
  
  container.innerHTML = "";
  sorted.slice(0, 5).forEach((trx) => {
    container.innerHTML += `
      <div class="activity-item">
        <span class="activity-icon">${trx.status === "borrowed" ? "📤" : "📥"}</span>
        <span>
          <strong>${trx.memberName}</strong> ${trx.status === "borrowed" ? "meminjam" : "mengembalikan"} 
          <em>${trx.bookTitle}</em>
          <br>
          <small>${trx.borrowDate || "-"}</small>
        </span>
      </div>
    `;
  });
  
  if (!container.innerHTML) container.innerHTML = "<em>Tidak ada aktivitas terbaru.</em>";
}

// Navigation
function showSection(section) {
  ["dashboard", "books", "members", "borrow", "return", "reports", "settings"].forEach((id) => {
    document.getElementById(id + "-section").classList.add("hidden");
  });
  document.getElementById(section + "-section").classList.remove("hidden");
  
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.textContent.toLowerCase().includes(section)) btn.classList.add("active");
  });
}

// Modal close by click outside
window.onclick = function (event) {
  ["bookModal", "memberModal"].forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (event.target === modal) closeModal(modalId);
  });
};

// RFID Handler integration
function setupRFIDListener() {
  const rfidRef = database.ref("current_rfid");

  rfidRef.on("value", async (snapshot) => {
    const data = snapshot.val();
    if (data && data.uid) {
      // Jika berada di halaman Peminjaman
      const borrowSection = document.getElementById("borrow-section");
      if (borrowSection && !borrowSection.classList.contains("hidden")) {
        document.getElementById("borrowUID").value = data.uid;
        verifyBorrowUID();
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
        database.ref("current_rfid").set({})
          .catch((error) => console.error("Error clearing RFID:", error));
      }, 2000);
    }
  });
}
