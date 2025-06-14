
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
  console.log("DOM loaded, initializing app...");
  initializeForms();
  loadData();
  initializeCharts();
  setupRFIDListener();
});

function initializeForms() {
  // Setup Book Form
  const bookForm = document.getElementById("bookForm");
  if (bookForm) {
    bookForm.onsubmit = function (e) {
      e.preventDefault();
      console.log("Book form submitted");
      
      const data = {
        title: document.getElementById("bookTitle").value,
        author: document.getElementById("bookAuthor").value,
        publisher: document.getElementById("bookPublisher").value,
        year: document.getElementById("bookYear").value,
        isbn: document.getElementById("bookISBN").value,
        category: document.getElementById("bookCategory").value,
        stock: parseInt(document.getElementById("bookStock").value) || 1,
        createdAt: new Date().toISOString()
      };
      
      console.log("Book data:", data);
      
      if (currentEditId) {
        database.ref("Books/" + currentEditId).update(data)
          .then(() => {
            console.log("Book updated successfully");
            alert("Buku berhasil diperbarui!");
          })
          .catch((error) => {
            console.error("Error updating book:", error);
            alert("Gagal memperbarui buku: " + error.message);
          });
      } else {
        database.ref("Books").push(data)
          .then(() => {
            console.log("Book added successfully");
            alert("Buku berhasil ditambahkan!");
          })
          .catch((error) => {
            console.error("Error adding book:", error);
            alert("Gagal menambahkan buku: " + error.message);
          });
      }
      
      closeModal("bookModal");
      this.reset();
      currentEditId = null;
    };
  }

  // Setup Member Form
  const memberForm = document.getElementById("memberForm");
  if (memberForm) {
    memberForm.onsubmit = function (e) {
      e.preventDefault();
      console.log("Member form submitted");
      
      const data = {
        uid: document.getElementById("memberUID").value,
        name: document.getElementById("memberName").value,
        email: document.getElementById("memberEmail").value,
        phone: document.getElementById("memberPhone").value,
        address: document.getElementById("memberAddress").value,
        type: document.getElementById("memberType").value,
        createdAt: new Date().toISOString()
      };
      
      console.log("Member data:", data);
      
      if (currentEditId) {
        database.ref("Members/" + currentEditId).update(data)
          .then(() => {
            console.log("Member updated successfully");
            alert("Anggota berhasil diperbarui!");
          })
          .catch((error) => {
            console.error("Error updating member:", error);
            alert("Gagal memperbarui anggota: " + error.message);
          });
      } else {
        database.ref("Members").push(data)
          .then(() => {
            console.log("Member added successfully");
            alert("Anggota berhasil ditambahkan!");
          })
          .catch((error) => {
            console.error("Error adding member:", error);
            alert("Gagal menambahkan anggota: " + error.message);
          });
      }
      
      closeModal("memberModal");
      this.reset();
      currentEditId = null;
    };
  }
}

function loadData() {
  console.log("Loading data from Firebase...");
  
  database.ref("Books").on("value", (snap) => {
    console.log("Books data received:", snap.val());
    allBooks = snap.val() || {};
    displayBooks();
    updateBookOptions();
    updateDashboard();
    updateCategoryChart();
  }, (error) => {
    console.error("Error loading books:", error);
  });
  
  database.ref("Members").on("value", (snap) => {
    console.log("Members data received:", snap.val());
    allMembers = snap.val() || {};
    displayMembers();
    updateDashboard();
  }, (error) => {
    console.error("Error loading members:", error);
  });
  
  database.ref("Transactions").on("value", (snap) => {
    console.log("Transactions data received:", snap.val());
    allTransactions = snap.val() || {};
    updateDashboard();
    updateRecentActivities();
    updateWeeklyChart();
  }, (error) => {
    console.error("Error loading transactions:", error);
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
  if (!booksList) return;
  
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
          <br><small>Pengarang: ${book.author || ""}</small>
          <br><small>Kategori: ${book.category || ""}</small>
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

  if (booksList.innerHTML === "") {
    booksList.innerHTML = '<div class="item-card"><em>Tidak ada buku yang ditemukan.</em></div>';
  }
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
  if (!membersList) return;
  
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
      .then(() => {
        console.log("Book deleted successfully");
        alert("Buku berhasil dihapus!");
      })
      .catch((error) => {
        console.error("Error deleting book:", error);
        alert("Gagal menghapus buku: " + error.message);
      });
  }
}

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
      .then(() => {
        console.log("Member deleted successfully");
        alert("Anggota berhasil dihapus!");
      })
      .catch((error) => {
        console.error("Error deleting member:", error);
        alert("Gagal menghapus anggota: " + error.message);
      });
  }
}

// Modal helpers
function showModal(id) {
  document.getElementById(id).style.display = "block";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
  currentEditId = null;
  if (id === "bookModal") {
    const bookForm = document.getElementById("bookForm");
    if (bookForm) bookForm.reset();
  }
  if (id === "memberModal") {
    const memberForm = document.getElementById("memberForm");
    if (memberForm) memberForm.reset();
  }
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
      statusText.style.backgroundColor = "#d4edda";
      statusText.style.color = "#155724";
      content.classList.remove("hidden");
      memberDetails.innerHTML = `
        <strong>${member.name}</strong><br>
        Email: ${member.email || "-"}<br>
        Tipe: ${member.type || "-"}
      `;
    }
  });

  if (!found && uid) {
    content.classList.add("hidden");
    memberDetails.innerHTML = "";
    statusText.textContent = "Status: UID tidak dikenali.";
    statusText.style.backgroundColor = "#f8d7da";
    statusText.style.color = "#721c24";
  } else if (!uid) {
    content.classList.add("hidden");
    memberDetails.innerHTML = "";
    statusText.textContent = "Status: Menunggu tap kartu anggota...";
    statusText.style.backgroundColor = "#e3f2fd";
    statusText.style.color = "#0d47a1";
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
  listItem.innerHTML += ` <button onclick="removeSelectedBook('${bookId}')" style="margin-left: 10px; color: red;">❌</button>`;
  document.getElementById("selectedBooksList").appendChild(listItem);
  
  // Reset select
  document.getElementById("borrowBookSelect").value = "";
}

function removeSelectedBook(bookId) {
  selectedBooks = selectedBooks.filter(id => id !== bookId);
  displaySelectedBooks();
}

function displaySelectedBooks() {
  const list = document.getElementById("selectedBooksList");
  list.innerHTML = "";
  selectedBooks.forEach(bookId => {
    const book = allBooks[bookId];
    if (book) {
      const listItem = document.createElement("li");
      listItem.textContent = book.title;
      listItem.innerHTML += ` <button onclick="removeSelectedBook('${bookId}')" style="margin-left: 10px; color: red;">❌</button>`;
      list.appendChild(listItem);
    }
  });
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

  let processedCount = 0;
  const totalBooks = selectedBooks.length;

  selectedBooks.forEach((bookId) => {
    const book = allBooks[bookId];
    if (book && book.stock > 0) {
      const trxData = {
        memberId,
        memberName,
        uid,
        bookId,
        bookTitle: book.title,
        borrowDate: tanggalPinjam,
        dueDate: tanggalJatuhTempo,
        status: "borrowed",
        createdAt: new Date().toISOString()
      };

      database.ref("Transactions").push(trxData)
        .then(() => {
          return database.ref("Books/" + bookId).update({
            stock: Number(book.stock) - 1,
          });
        })
        .then(() => {
          processedCount++;
          console.log(`Transaction processed successfully for book: ${book.title}`);
          
          if (processedCount === totalBooks) {
            alert(`Peminjaman ${processedCount} buku berhasil!`);
            resetBorrowForm();
          }
        })
        .catch((error) => {
          console.error("Error processing transaction:", error);
          alert("Gagal memproses peminjaman: " + error.message);
        });
    }
  });
}

function resetBorrowForm() {
  document.getElementById("borrowUID").value = "";
  document.getElementById("borrowRfidStatus").textContent = "Status: Menunggu tap kartu anggota...";
  document.getElementById("borrowRfidStatus").style.backgroundColor = "#e3f2fd";
  document.getElementById("borrowRfidStatus").style.color = "#0d47a1";
  document.getElementById("borrowSectionContent").classList.add("hidden");
  document.getElementById("borrowMemberDetails").innerHTML = "";
  document.getElementById("selectedBooksList").innerHTML = "";
  selectedBooks = [];
  document.getElementById("borrowBookSelect").selectedIndex = 0;
}

// Pengembalian
function loadMemberForReturn() {
  const uid = document.getElementById("returnUID").value.trim();
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
            <small>Dipinjam: ${trx.borrowDate}</small>
            <br>
            <small>Jatuh tempo: ${trx.dueDate}</small>
            ${overdue ? '<br><small style="color: red;">⚠️ TERLAMBAT</small>' : ''}
          </span>
          <button class="btn btn-success" onclick="processReturn('${trxId}')">📥 Kembalikan</button>
        </div>
      `;
    }
  });
  
  document.getElementById("returnMemberInfo").classList.toggle("hidden", !found);
  if (!found) {
    borrowedBooksList.innerHTML = "<em>Tidak ada buku yang sedang dipinjam.</em>";
  }
}

function processReturn(trxId) {
  const trx = allTransactions[trxId];
  if (!trx) {
    alert("Data transaksi tidak ditemukan!");
    return;
  }

  database.ref("Transactions/" + trxId).update({
    status: "returned",
    returnDate: new Date().toISOString().slice(0, 10)
  })
    .then(() => {
      const book = allBooks[trx.bookId];
      if (book) {
        return database.ref("Books/" + trx.bookId).update({ 
          stock: Number(book.stock) + 1 
        });
      }
    })
    .then(() => {
      alert("Pengembalian buku berhasil!");
      loadMemberForReturn();
    })
    .catch((error) => {
      console.error("Error processing return:", error);
      alert("Gagal memproses pengembalian: " + error.message);
    });
}

// Charts
function initializeCharts() {
  try {
    const ctx1 = document.getElementById("categoryChart");
    if (ctx1) {
      categoryChart = new Chart(ctx1.getContext("2d"), {
        type: "doughnut",
        data: { 
          labels: [], 
          datasets: [{ 
            data: [], 
            backgroundColor: [
              "#6c5ce7", "#fdcb6e", "#00b894", "#00cec9", 
              "#d63031", "#e17055", "#0984e3", "#636e72"
            ]
          }] 
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
    
    const ctx2 = document.getElementById("weeklyChart");
    if (ctx2) {
      weeklyChart = new Chart(ctx2.getContext("2d"), {
        type: "bar",
        data: {
          labels: [],
          datasets: [{ 
            label: "Peminjaman", 
            data: [], 
            backgroundColor: "#667eea" 
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  } catch (error) {
    console.error("Error initializing charts:", error);
  }
}

function updateCategoryChart() {
  if (!categoryChart) return;
  
  const categoryCount = {};
  Object.values(allBooks).forEach((book) => {
    const cat = book.category || "Lainnya";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  
  categoryChart.data.labels = Object.keys(categoryCount);
  categoryChart.data.datasets[0].data = Object.values(categoryCount);
  categoryChart.update();
}

function updateWeeklyChart() {
  if (!weeklyChart) return;
  
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
  if (!container) return;
  
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
  
  if (!container.innerHTML) {
    container.innerHTML = "<em>Tidak ada aktivitas terbaru.</em>";
  }
}

// Navigation
function showSection(section) {
  ["dashboard", "books", "members", "borrow", "return", "reports", "settings"].forEach((id) => {
    const element = document.getElementById(id + "-section");
    if (element) element.classList.add("hidden");
  });
  
  const targetSection = document.getElementById(section + "-section");
  if (targetSection) targetSection.classList.remove("hidden");
  
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.onclick && btn.onclick.toString().includes(section)) {
      btn.classList.add("active");
    }
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
  console.log("Setting up RFID listener...");
  const rfidRef = database.ref("current_rfid");

  rfidRef.on("value", async (snapshot) => {
    const data = snapshot.val();
    if (data && data.uid) {
      console.log("RFID data received:", data.uid);
      
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
        statusElement.style.backgroundColor = "#d4edda";
        statusElement.style.color = "#155724";
        setTimeout(() => {
          statusElement.style.backgroundColor = "";
          statusElement.style.color = "";
        }, 2000);
      }

      // Reset UID agar bisa tap kartu berikutnya
      setTimeout(() => {
        database.ref("current_rfid").set({})
          .catch((error) => console.error("Error clearing RFID:", error));
      }, 2000);
    }
  }, (error) => {
    console.error("Error in RFID listener:", error);
  });
}
