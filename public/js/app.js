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
  // Wait for DOM to be fully loaded
  setTimeout(() => {
    // Setup Book Form
    const bookForm = document.getElementById("bookForm");
    if (bookForm) {
      bookForm.addEventListener("submit", function (e) {
        e.preventDefault();
        console.log("Book form submitted");

        const titleEl = document.getElementById("bookTitle");
        const authorEl = document.getElementById("bookAuthor");
        const publisherEl = document.getElementById("bookPublisher");
        const yearEl = document.getElementById("bookYear");
        const isbnEl = document.getElementById("bookISBN");
        const categoryEl = document.getElementById("bookCategory");
        const stockEl = document.getElementById("bookStock");

        if (!titleEl || !authorEl || !categoryEl || !stockEl) {
          console.error("Book form elements not found");
          return;
        }

        const data = {
          title: titleEl.value,
          author: authorEl.value,
          publisher: publisherEl ? publisherEl.value : "",
          year: yearEl ? yearEl.value : "",
          isbn: isbnEl ? isbnEl.value : "",
          category: categoryEl.value,
          stock: parseInt(stockEl.value) || 1,
          status: "available",
          createdAt: new Date().toISOString(),
        };

        console.log("Book data:", data);

        if (currentEditId) {
          database
            .ref("Books/" + currentEditId)
            .update(data)
            .then(() => {
              console.log("Book updated successfully");
              alert("Buku berhasil diperbarui!");
              closeModal("bookModal");
              bookForm.reset();
              currentEditId = null;
            })
            .catch((error) => {
              console.error("Error updating book:", error);
              alert("Gagal memperbarui buku: " + error.message);
            });
        } else {
          database
            .ref("Books")
            .push(data)
            .then(() => {
              console.log("Book added successfully");
              alert("Buku berhasil ditambahkan!");
              closeModal("bookModal");
              bookForm.reset();
              currentEditId = null;
            })
            .catch((error) => {
              console.error("Error adding book:", error);
              alert("Gagal menambahkan buku: " + error.message);
            });
        }
      });
    }

    // Setup Member Form
    const memberForm = document.getElementById("memberForm");
    if (memberForm) {
      memberForm.addEventListener("submit", function (e) {
        e.preventDefault();
        console.log("Member form submitted");

        const uidEl = document.getElementById("memberUID");
        const nameEl = document.getElementById("memberName");
        const emailEl = document.getElementById("memberEmail");
        const phoneEl = document.getElementById("memberPhone");
        const addressEl = document.getElementById("memberAddress");
        const typeEl = document.getElementById("memberType");

        if (!uidEl || !nameEl || !typeEl) {
          console.error("Member form elements not found");
          return;
        }

        const data = {
          uid: uidEl.value,
          name: nameEl.value,
          email: emailEl ? emailEl.value : "",
          phone: phoneEl ? phoneEl.value : "",
          address: addressEl ? addressEl.value : "",
          type: typeEl.value,
          status: "active",
          createdAt: new Date().toISOString(),
        };

        console.log("Member data:", data);

        if (currentEditId) {
          database
            .ref("Members/" + currentEditId)
            .update(data)
            .then(() => {
              console.log("Member updated successfully");
              alert("Anggota berhasil diperbarui!");
              closeModal("memberModal");
              memberForm.reset();
              currentEditId = null;
            })
            .catch((error) => {
              console.error("Error updating member:", error);
              alert("Gagal memperbarui anggota: " + error.message);
            });
        } else {
          database
            .ref("Members")
            .push(data)
            .then(() => {
              console.log("Member added successfully");
              alert("Anggota berhasil ditambahkan!");
              closeModal("memberModal");
              memberForm.reset();
              currentEditId = null;
            })
            .catch((error) => {
              console.error("Error adding member:", error);
              alert("Gagal menambahkan anggota: " + error.message);
            });
        }
      });
    }
  }, 500);
}

let dataLoaded = false;

function loadData() {
  console.log("Loading data from Firebase...");

  if (dataLoaded) {
    console.log("Data already loading, skipping...");
    return;
  }

  dataLoaded = true;
  // Load Userdata untuk mendapatkan UID kartu
  database.ref("Userdata").on(
    "value",
    (snap) => {
      console.log("Userdata received:", snap.val());
      // Tidak perlu update UI untuk userdata, hanya untuk referensi
    },
    (error) => {
      console.error("Error loading userdata:", error);
    }
  );
  // Load Books
  database.ref("Books").on(
    "value",
    (snap) => {
      console.log("Books data received:", snap.val());
      allBooks = snap.val() || {};
      debounceUpdate("books");
    },
    (error) => {
      console.error("Error loading books:", error);
    }
  );

  // Load Members
  database.ref("Members").on(
    "value",
    (snap) => {
      console.log("Members data received:", snap.val());
      allMembers = snap.val() || {};
      debounceUpdate("members");
    },
    (error) => {
      console.error("Error loading members:", error);
    }
  );

  // Load Transactions
  database.ref("Transactions").on(
    "value",
    (snap) => {
      console.log("Transactions data received:", snap.val());
      allTransactions = snap.val() || {};
      debounceUpdate("transactions");
    },
    (error) => {
      console.error("Error loading transactions:", error);
    }
  );
}

let updateTimeouts = {};

function debounceUpdate(type) {
  if (updateTimeouts[type]) {
    clearTimeout(updateTimeouts[type]);
  }

  updateTimeouts[type] = setTimeout(() => {
    try {
      console.log(`Updating ${type}...`);
      switch (type) {
        case "books":
          displayBooks();
          updateBookOptions();
          updateDashboard();
          // Add delay before updating chart to ensure DOM is ready
          setTimeout(() => updateCategoryChart(), 100);
          break;
        case "members":
          displayMembers();
          updateDashboard();
          break;
        case "transactions":
          updateDashboard();
          updateRecentActivities();
          // Add delay before updating chart to ensure DOM is ready
          setTimeout(() => updateWeeklyChart(), 100);
          break;
      }
    } catch (error) {
      console.error(`Error in debounceUpdate for ${type}:`, error);
    }
  }, 300);
}

function updateDashboard() {
  try {
    // Total Books - count all available books
    let totalBooks = 0;
    Object.values(allBooks).forEach((book) => {
      if (book && typeof book.stock === "number") {
        totalBooks += book.stock;
      } else if (book && book.stock) {
        totalBooks += parseInt(book.stock) || 0;
      }
    });

    // Update dashboard stats
    const totalBooksEl = document.getElementById("totalBooks");
    const totalMembersEl = document.getElementById("totalMembers");
    const borrowedBooksEl = document.getElementById("borrowedBooks");
    const overdueBooksEl = document.getElementById("overdueBooks");

    if (totalBooksEl) totalBooksEl.textContent = totalBooks;
    if (totalMembersEl)
      totalMembersEl.textContent = Object.keys(allMembers).length;

    // Count borrowed and overdue books
    let borrowedBooks = 0,
      overdueBooks = 0;
    const today = new Date().toISOString().slice(0, 10);

    Object.values(allTransactions).forEach((trx) => {
      if (trx && trx.status === "borrowed") {
        borrowedBooks++;
        if (trx.dueDate && trx.dueDate < today) {
          overdueBooks++;
        }
      }
    });

    if (borrowedBooksEl) borrowedBooksEl.textContent = borrowedBooks;
    if (overdueBooksEl) overdueBooksEl.textContent = overdueBooks;

    console.log("Dashboard updated:", {
      totalBooks,
      totalMembers: Object.keys(allMembers).length,
      borrowedBooks,
      overdueBooks,
    });
  } catch (error) {
    console.error("Error updating dashboard:", error);
  }
}

function displayBooks() {
  try {
    const booksList = document.getElementById("booksList");
    if (!booksList) return;

    const searchEl = document.getElementById("bookSearch");
    const search = (searchEl?.value || "").toLowerCase();

    // Clear existing content
    booksList.innerHTML = "";

    if (!allBooks || Object.keys(allBooks).length === 0) {
      booksList.innerHTML =
        '<div class="item-card"><em>Tidak ada buku tersedia.</em></div>';
      return;
    }

    let hasResults = false;

    Object.entries(allBooks).forEach(([id, book]) => {
      if (!book) return;

      const title = book.title || "";
      const author = book.author || "";
      const category = book.category || "";

      if (
        !search ||
        title.toLowerCase().includes(search) ||
        author.toLowerCase().includes(search) ||
        category.toLowerCase().includes(search)
      ) {
        hasResults = true;
        const status = (book.stock || 0) > 0 ? "Tersedia" : "Terpinjam";
        const statusClass =
          (book.stock || 0) > 0 ? "status-available" : "status-borrowed";

        const bookCard = document.createElement("div");
        bookCard.className = "item-card";
        bookCard.innerHTML = `
          <strong>${title}</strong> <span class="stock-info">Stok: ${
          book.stock || 0
        }</span>
          <br><small>Pengarang: ${author}</small>
          <br><small>Kategori: ${category}</small>
          <div>
            <span class="status-badge ${statusClass}">${status}</span>
          </div>
          <div>
            <button class="btn" onclick="editBook('${id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="deleteBook('${id}')">🗑️ Hapus</button>
          </div>
        `;
        booksList.appendChild(bookCard);
      }
    });

    if (!hasResults) {
      booksList.innerHTML =
        '<div class="item-card"><em>Tidak ada buku yang ditemukan.</em></div>';
    }
  } catch (error) {
    console.error("Error displaying books:", error);
    const booksList = document.getElementById("booksList");
    if (booksList) {
      booksList.innerHTML =
        '<div class="item-card"><em>Error loading books.</em></div>';
    }
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
  try {
    const membersList = document.getElementById("membersList");
    if (!membersList) return;

    const searchEl = document.getElementById("memberSearch");
    const search = (searchEl?.value || "").toLowerCase();

    // Clear existing content
    membersList.innerHTML = "";

    if (!allMembers || Object.keys(allMembers).length === 0) {
      membersList.innerHTML =
        '<div class="item-card"><em>Tidak ada anggota tersedia.</em></div>';
      return;
    }

    let hasResults = false;

    Object.entries(allMembers).forEach(([id, member]) => {
      if (!member) return;

      const name = member.name || "";
      const uid = member.uid || "";
      const email = member.email || "";
      const type = member.type || "";

      if (
        !search ||
        name.toLowerCase().includes(search) ||
        uid.toLowerCase().includes(search) ||
        email.toLowerCase().includes(search) ||
        type.toLowerCase().includes(search)
      ) {
        hasResults = true;
        const memberCard = document.createElement("div");
        memberCard.className = "item-card";
        memberCard.innerHTML = `
          <strong>${name}</strong>
          <div>
            <span class="status-badge status-available">UID: ${uid}</span>
            <span class="stock-info">Tipe: ${type}</span>
          </div>
          <div>
            <small>Email: ${email || "-"}</small><br>
            <small>Telepon: ${member.phone || "-"}</small>
          </div>
          <div>
            <button class="btn" onclick="editMember('${id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="deleteMember('${id}')">🗑️ Hapus</button>
          </div>
        `;
        membersList.appendChild(memberCard);
      }
    });

    if (!hasResults) {
      membersList.innerHTML =
        '<div class="item-card"><em>Tidak ada anggota yang ditemukan.</em></div>';
    }
  } catch (error) {
    console.error("Error displaying members:", error);
    const membersList = document.getElementById("membersList");
    if (membersList) {
      membersList.innerHTML =
        '<div class="item-card"><em>Error loading members.</em></div>';
    }
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
    database
      .ref("Books/" + id)
      .remove()
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
    database
      .ref("Members/" + id)
      .remove()
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
    memberRfidListening = false;
    const statusElement = document.getElementById("memberRfidStatus");
    const btnElement = document.getElementById("memberRfidBtn");
    if (statusElement) {
      statusElement.textContent = "Status: Siap untuk tap kartu";
      statusElement.className = "rfid-status";
    }
    if (btnElement) {
      btnElement.textContent = "📱 Tap Kartu";
      btnElement.classList.remove("btn-danger");
    }
  }
  document.getElementById("bookModalTitle").textContent = "Tambah Buku";
  document.getElementById("memberModalTitle").textContent = "Tambah Anggota";
}

let selectedBooks = [];

function verifyBorrowUID() {
  const uid = document.getElementById("borrowUID").value.trim();
  const statusText = document.getElementById("borrowRfidStatus");
  const content = document.getElementById("borrowSectionContent");
  let found = false;
  let memberData = null;

  Object.entries(allMembers).forEach(([id, member]) => {
    if (member.uid === uid) {
      found = true;
      memberData = member;
      statusText.textContent = `Status: UID ditemukan - ${member.name}`;
      statusText.style.backgroundColor = "#d4edda";
      statusText.style.color = "#155724";
      content.classList.remove("hidden");

      // Populate the borrow content
      content.innerHTML = `
        <div id="borrowMemberDetails" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3>📋 Detail Anggota</h3>
          <strong>${member.name}</strong><br>
          <small>Email: ${member.email || "-"}</small><br>
          <small>Tipe: ${member.type || "-"}</small><br>
          <small>UID: ${member.uid}</small>
        </div>
        
        <div class="form-group">
          <label for="borrowBookSelect">📚 Pilih Buku:</label>
          <select id="borrowBookSelect" style="width: 70%; display: inline-block;">
            <option value="">-- Pilih Buku --</option>
          </select>
          <button type="button" class="btn" onclick="selectBookForBorrow()" style="margin-left: 10px;">➕ Tambah</button>
        </div>
        
        <div class="form-group">
          <label>📖 Buku yang Dipilih:</label>
          <ul id="selectedBooksList" style="margin-left: 20px; min-height: 40px; border: 1px dashed #ccc; padding: 10px; border-radius: 5px;">
            
          </ul>
          <small style="color: #666;">Maksimal 3 buku per peminjaman</small>
        </div>
        
        <div class="form-group" style="margin-top: 20px;">
          <button type="button" class="btn btn-success" onclick="processBorrow()" style="width: 100%; padding: 15px; font-size: 1.1em;">
            📤 Proses Peminjaman
          </button>
        </div>
      `;

      // Update book options after content is added
      updateBookOptions();
    }
  });

  if (!found && uid) {
    content.classList.add("hidden");
    content.innerHTML = "";
    statusText.textContent = "Status: UID tidak dikenali.";
    statusText.style.backgroundColor = "#f8d7da";
    statusText.style.color = "#721c24";
  } else if (!uid) {
    content.classList.add("hidden");
    content.innerHTML = "";
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
  selectedBooks = selectedBooks.filter((id) => id !== bookId);
  displaySelectedBooks();
}

function displaySelectedBooks() {
  const list = document.getElementById("selectedBooksList");
  list.innerHTML = "";
  selectedBooks.forEach((bookId) => {
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
        createdAt: new Date().toISOString(),
      };

      database
        .ref("Transactions")
        .push(trxData)
        .then(() => {
          return database.ref("Books/" + bookId).update({
            stock: Number(book.stock) - 1,
          });
        })
        .then(() => {
          processedCount++;
          console.log(
            `Transaction processed successfully for book: ${book.title}`
          );

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
  document.getElementById("borrowRfidStatus").textContent =
    "Status: Menunggu tap kartu anggota...";
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
            ${
              overdue
                ? '<br><small style="color: red;">⚠️ TERLAMBAT</small>'
                : ""
            }
          </span>
          <button class="btn btn-success" onclick="processReturn('${trxId}')">📥 Kembalikan</button>
        </div>
      `;
    }
  });

  document
    .getElementById("returnMemberInfo")
    .classList.toggle("hidden", !found);
  if (!found) {
    borrowedBooksList.innerHTML =
      "<em>Tidak ada buku yang sedang dipinjam.</em>";
  }
}

function processReturn(trxId) {
  const trx = allTransactions[trxId];
  if (!trx) {
    alert("Data transaksi tidak ditemukan!");
    return;
  }

  database
    .ref("Transactions/" + trxId)
    .update({
      status: "returned",
      returnDate: new Date().toISOString().slice(0, 10),
    })
    .then(() => {
      const book = allBooks[trx.bookId];
      if (book) {
        return database.ref("Books/" + trx.bookId).update({
          stock: Number(book.stock) + 1,
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
  setTimeout(() => {
    const ctx1 = document.getElementById("categoryChart");
    const ctx2 = document.getElementById("weeklyChart");

    if (ctx1 && !categoryChart) {
      categoryChart = new Chart(ctx1.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: [],
          datasets: [
            { data: [], backgroundColor: [...warnaKategori()], borderWidth: 0 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { usePointStyle: true, padding: 20 },
            },
          },
        },
      });
    }

    if (ctx2 && !weeklyChart) {
      weeklyChart = new Chart(ctx2.getContext("2d"), {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "Peminjaman",
              data: [],
              backgroundColor: "#667eea",
              borderColor: "#667eea",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          plugins: { legend: { display: true, position: "top" } },
        },
      });
    }
  }, 1000);
}

function warnaKategori() {
  return [
    "#6c5ce7",
    "#fdcb6e",
    "#00b894",
    "#00cec9",
    "#d63031",
    "#e17055",
    "#0984e3",
    "#636e72",
  ];
}

function updateCategoryChart() {
  if (!categoryChart) return;

  try {
    const categoryCount = {};

    Object.values(allBooks || {}).forEach((book) => {
      const cat = book.category || "Tanpa Kategori";
      categoryCount[cat] =
        (categoryCount[cat] || 0) + parseInt(book.stock || 0);
    });

    // Jika tidak ada data
    if (Object.keys(categoryCount).length === 0) {
      categoryCount["Belum Ada"] = 1;
    }

    categoryChart.data.labels = Object.keys(categoryCount);
    categoryChart.data.datasets[0].data = Object.values(categoryCount);
    categoryChart.update("none");
  } catch (err) {
    console.error("Error updating category chart:", err);
  }
}

function updateWeeklyChart() {
  if (!weeklyChart) return;

  try {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    Object.values(allTransactions || {}).forEach((trx) => {
      if (trx && trx.status === "borrowed" && trx.borrowDate) {
        const day = new Date(trx.borrowDate).getDay();
        counts[day]++;
      }
    });

    // Gunakan data dummy jika semua nol
    if (counts.every((c) => c === 0)) {
      counts[1] = 1;
      counts[4] = 1;
    }

    weeklyChart.data.labels = days;
    weeklyChart.data.datasets[0].data = counts;
    weeklyChart.update("none");
  } catch (err) {
    console.error("Error updating weekly chart:", err);
  }
}

let currentActivityPage = 0;
const activitiesPerPage = 5;

function updateRecentActivities() {
  const container = document.getElementById("recentActivities");
  if (!container) return;

  const sorted = Object.values(allTransactions).sort((a, b) =>
    (b.borrowDate || "").localeCompare(a.borrowDate || "")
  );

  const totalActivities = sorted.length;
  const totalPages = Math.ceil(totalActivities / activitiesPerPage);

  if (currentActivityPage >= totalPages) {
    currentActivityPage = Math.max(0, totalPages - 1);
  }

  const startIndex = currentActivityPage * activitiesPerPage;
  const endIndex = startIndex + activitiesPerPage;
  const currentActivities = sorted.slice(startIndex, endIndex);

  container.innerHTML = "";

  if (currentActivities.length === 0) {
    container.innerHTML += "<em>Tidak ada aktivitas terbaru.</em>";
  } else {
    currentActivities.forEach((trx) => {
      container.innerHTML += `
        <div class="activity-item">
          <span class="activity-icon">${
            trx.status === "borrowed" ? "📤" : "📥"
          }</span>
          <span>
            <strong>${trx.memberName}</strong> ${
        trx.status === "borrowed" ? "meminjam" : "mengembalikan"
      } 
            <em>${trx.bookTitle}</em>
            <br>
            <small>${trx.borrowDate || trx.returnDate || "-"}</small>
          </span>
        </div>
      `;
    });
  }

  // Tambahkan pagination di bawah
  if (totalPages > 1) {
    container.innerHTML += `
      <div class="pagination-controls" style="margin-top: 1rem; text-align:center;">
        <button class="btn pagination-btn" onclick="previousActivityPage()" ${
          currentActivityPage === 0 ? "disabled" : ""
        }>
          ⬅️ Sebelumnya
        </button>
        <span class="pagination-info">
          Halaman ${currentActivityPage + 1} dari ${totalPages}
        </span>
        <button class="btn pagination-btn" onclick="nextActivityPage()" ${
          currentActivityPage >= totalPages - 1 ? "disabled" : ""
        }>
          Selanjutnya ➡️
        </button>
      </div>
    `;
  }
}

function nextActivityPage() {
  const totalActivities = Object.values(allTransactions).length;
  const totalPages = Math.ceil(totalActivities / activitiesPerPage);

  if (currentActivityPage < totalPages - 1) {
    currentActivityPage++;
    updateRecentActivities();
  }
}

function previousActivityPage() {
  if (currentActivityPage > 0) {
    currentActivityPage--;
    updateRecentActivities();
  }
}

// Navigation
function showSection(section) {
  // Reset RFID listening states when switching sections
  memberRfidListening = false;
  borrowRfidListening = false;
  returnRfidListening = false;

  [
    "dashboard",
    "books",
    "members",
    "borrow",
    "return",
    "reports",
    "settings",
  ].forEach((id) => {
    const element = document.getElementById(id + "-section");
    if (element) element.classList.add("hidden");
  });

  const targetSection = document.getElementById(section + "-section");
  if (targetSection) targetSection.classList.remove("hidden");

  // Reset RFID button states
  const borrowRfidBtn = document.getElementById("borrowRfidBtn");
  const returnRfidBtn = document.getElementById("returnRfidBtn");
  const borrowRfidStatus = document.getElementById("borrowRfidStatus");
  const returnRfidStatus = document.getElementById("returnRfidStatus");

  if (borrowRfidBtn) {
    borrowRfidBtn.textContent = "📱 Tap Kartu";
    borrowRfidBtn.classList.remove("btn-danger");
  }
  if (returnRfidBtn) {
    returnRfidBtn.textContent = "📱 Tap Kartu";
    returnRfidBtn.classList.remove("btn-danger");
  }
  if (borrowRfidStatus) {
    borrowRfidStatus.textContent = "Status: Menunggu tap kartu anggota...";
    borrowRfidStatus.className = "rfid-status";
  }
  if (returnRfidStatus) {
    returnRfidStatus.textContent = "Status: Menunggu tap kartu anggota...";
    returnRfidStatus.className = "rfid-status";
  }

  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.onclick && btn.onclick.toString().includes(section)) {
      btn.classList.add("active");
    }
  });
}

// Modal close by click outside
window.onclick = function (event) {
  ["bookModal", "memberModal", "reportModal"].forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (event.target === modal) closeModal(modalId);
  });
};
let currentReportData = null;
let currentReportType = null;

function generateDailyReport() {
  const date = document.getElementById("dailyReportDate").value;
  if (!date) return alert("Pilih tanggal terlebih dahulu!");

  const transactions = [];
  Object.values(allTransactions || {}).forEach((trx) => {
    if (trx.borrowDate === date) {
      transactions.push(trx);
    }
  });

  currentReportData = transactions;
  currentReportType = "daily";

  displayReportModal(
    `📅 Laporan Harian - ${formatDate(date)}`,
    transactions,
    "daily"
  );
}

function generateCirculationReport() {
  const period = document.getElementById("circulationPeriod").value;
  let transactions = [];
  let title = "";

  const today = new Date();
  const currentDate = today.toISOString().slice(0, 10);

  Object.values(allTransactions || {}).forEach((trx) => {
    let include = false;
    const trxDate = new Date(trx.borrowDate);

    switch (period) {
      case "all":
        include = true;
        title = "📊 Laporan Sirkulasi - Semua Data";
        break;
      case "thisWeek":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        include = trxDate >= weekStart;
        title = "📊 Laporan Sirkulasi - Minggu Ini";
        break;
      case "thisMonth":
        include =
          trx.borrowDate && trx.borrowDate.startsWith(currentDate.slice(0, 7));
        title = "📊 Laporan Sirkulasi - Bulan Ini";
        break;
      case "lastMonth":
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().slice(0, 7);
        include = trx.borrowDate && trx.borrowDate.startsWith(lastMonthStr);
        title = "📊 Laporan Sirkulasi - Bulan Lalu";
        break;
    }

    if (include) {
      transactions.push(trx);
    }
  });

  currentReportData = transactions;
  currentReportType = "circulation";

  displayReportModal(title, transactions, "circulation");
}

let currentPage = 1;
const itemsPerPage = 10;

function displayReportModal(title, transactions, type) {
  const modal = document.getElementById("reportModal");
  const modalTitle = document.getElementById("reportModalTitle");
  const modalContent = document.getElementById("reportModalContent");

  modalTitle.textContent = title;

  if (transactions.length === 0) {
    modalContent.innerHTML = `<div style="text-align: center; padding: 50px; color: #666;">
        <h3>📋 Tidak ada data untuk periode yang dipilih</h3>
        <p>Silakan pilih periode lain atau periksa data transaksi.</p>
      </div>`;
  } else {
    currentPage = 1; // Reset ke halaman 1 setiap kali membuka laporan baru
    const paginatedData = paginateData(transactions);
    let tableHTML = "";

    if (type === "daily") {
      tableHTML = generateDailyReportTable(paginatedData);
    } else {
      tableHTML = generateCirculationReportTable(paginatedData);
    }

    // Tambahkan pagination controls
    tableHTML += generatePaginationControls(transactions.length);

    modalContent.innerHTML = tableHTML;
  }

  showModal("reportModal");
}

function paginateData(data) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return data.slice(startIndex, endIndex);
}

function generatePaginationControls(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return `
    <div class="pagination-table">
      <div class="pagination-info">
        Menampilkan ${startItem}-${endItem} dari ${totalItems} entri
      </div>
      <div class="pagination-controls">
        <button class="btn pagination-btn" onclick="changePage(${
          currentPage - 1
        })" ${currentPage === 1 ? "disabled" : ""}>
          Sebelumnya
        </button>
        ${generatePageNumbers(totalPages)}
        <button class="btn pagination-btn" onclick="changePage(${
          currentPage + 1
        })" ${currentPage === totalPages ? "disabled" : ""}>
          Selanjutnya
        </button>
      </div>
    </div>
  `;
}

function generatePageNumbers(totalPages) {
  let pageNumbers = "";
  const maxVisiblePages = 5;
  let startPage, endPage;

  if (totalPages <= maxVisiblePages) {
    startPage = 1;
    endPage = totalPages;
  } else {
    const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
    const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;

    if (currentPage <= maxPagesBeforeCurrent) {
      startPage = 1;
      endPage = maxVisiblePages;
    } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
      startPage = totalPages - maxVisiblePages + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - maxPagesBeforeCurrent;
      endPage = currentPage + maxPagesAfterCurrent;
    }
  }

  if (startPage > 1) {
    pageNumbers += `<button class="btn pagination-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      pageNumbers += `<span class="pagination-ellipsis">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers += `
      <button class="btn pagination-btn ${
        i === currentPage ? "active" : ""
      }" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageNumbers += `<span class="pagination-ellipsis">...</span>`;
    }
    pageNumbers += `<button class="btn pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  return pageNumbers;
}

function changePage(newPage) {
  const totalPages = Math.ceil(currentReportData.length / itemsPerPage);

  if (newPage < 1 || newPage > totalPages) return;

  currentPage = newPage;
  const paginatedData = paginateData(currentReportData);

  const modalContent = document.getElementById("reportModalContent");
  let tableHTML = "";

  if (currentReportType === "daily") {
    tableHTML = generateDailyReportTable(paginatedData);
  } else {
    tableHTML = generateCirculationReportTable(paginatedData);
  }

  tableHTML += generatePaginationControls(currentReportData.length);
  modalContent.innerHTML = tableHTML;
}

function generateDailyReportTable(transactions) {
  let html = `
    <table class="report-table">
      <thead>
        <tr>
          <th>No</th>
          <th>Nama Peminjam</th>
          <th>Judul Buku</th>
          <th>Tanggal Pinjam</th>
          <th>Jatuh Tempo</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  transactions.forEach((trx, index) => {
    const status = trx.status === "borrowed" ? "Dipinjam" : "Dikembalikan";
    const statusClass =
      trx.status === "borrowed" ? "status-borrowed" : "status-available";

    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${trx.memberName || "-"}</td>
        <td>${trx.bookTitle || "-"}</td>
        <td>${formatDate(trx.borrowDate)}</td>
        <td>${formatDate(trx.dueDate)}</td>
        <td class="status-cell">
          <span class="status-badge ${statusClass}">${status}</span>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <div class="report-summary">
      <div class="summary-item">
        <span class="summary-number">${transactions.length}</span>
        <span class="summary-label">Total Transaksi</span>
      </div>
      <div class="summary-item">
        <span class="summary-number">${
          transactions.filter((t) => t.status === "borrowed").length
        }</span>
        <span class="summary-label">Masih Dipinjam</span>
      </div>
      <div class="summary-item">
        <span class="summary-number">${
          transactions.filter((t) => t.status === "returned").length
        }</span>
        <span class="summary-label">Sudah Dikembalikan</span>
      </div>
    </div>
  `;

  return html;
}

function generateCirculationReportTable(transactions) {
  let html = `
    <table class="report-table">
      <thead>
        <tr>
          <th>No</th>
          <th>ID Anggota</th>
          <th>Nama</th>
          <th>Buku</th>
          <th>Tgl Pinjam</th>
          <th>Jatuh Tempo</th>
          <th>Tgl Dikembalikan</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  transactions.forEach((trx, index) => {
    const isOverdue =
      trx.status === "borrowed" &&
      trx.dueDate < new Date().toISOString().slice(0, 10);
    let status = trx.status === "borrowed" ? "Dipinjam" : "Dikembalikan";
    let statusClass =
      trx.status === "borrowed" ? "status-borrowed" : "status-available";

    if (isOverdue) {
      status = "Terlambat";
      statusClass = "status-borrowed";
    }

    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${trx.uid || "-"}</td>
        <td>${trx.memberName || "-"}</td>
        <td>${trx.bookTitle || "-"}</td>
        <td>${formatDate(trx.borrowDate)}</td>
        <td>${formatDate(trx.dueDate)}</td>
        <td>${trx.returnDate ? formatDate(trx.returnDate) : "-"}</td>
        <td class="status-cell">
          <span class="status-badge ${statusClass}">${status}</span>
        </td>
      </tr>
    `;
  });

  const borrowedCount = transactions.filter(
    (t) => t.status === "borrowed"
  ).length;
  const returnedCount = transactions.filter(
    (t) => t.status === "returned"
  ).length;
  const overdueCount = transactions.filter(
    (t) =>
      t.status === "borrowed" &&
      t.dueDate < new Date().toISOString().slice(0, 10)
  ).length;

  html += `
      </tbody>
    </table>
    <div class="report-summary">
      <div class="summary-item">
        <span class="summary-number">${transactions.length}</span>
        <span class="summary-label">Total Sirkulasi</span>
      </div>
      <div class="summary-item">
        <span class="summary-number">${borrowedCount}</span>
        <span class="summary-label">Masih Dipinjam</span>
      </div>
      <div class="summary-item">
        <span class="summary-number">${returnedCount}</span>
        <span class="summary-label">Dikembalikan</span>
      </div>
      <div class="summary-item">
        <span class="summary-number">${overdueCount}</span>
        <span class="summary-label">Terlambat</span>
      </div>
    </div>
  `;

  return html;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function printCurrentReport() {
  if (!currentReportData) {
    alert("Tidak ada data laporan untuk dicetak!");
    return;
  }

  const modalTitle = document.getElementById("reportModalTitle").textContent;
  let modalContent = "";

  // Untuk print, tampilkan semua data tanpa pagination
  if (currentReportType === "daily") {
    modalContent = generateDailyReportTable(currentReportData);
  } else {
    modalContent = generateCirculationReportTable(currentReportData);
  }

  const win = window.open("", "_blank");
  win.document.write(
    `<html>
    <head>
      <title>${modalTitle}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          padding: 20px; 
          color: #333;
        }
        h2 { 
          text-align: center; 
          margin-bottom: 30px;
          color: #333;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px;
        }
        th, td { 
          border: 1px solid #333; 
          padding: 8px 12px; 
          text-align: left;
        }
        th { 
          background-color: #f0f0f0; 
          font-weight: bold;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-available { background-color: #d4edda; color: #155724; }
        .status-borrowed { background-color: #f8d7da; color: #721c24; }
        .report-summary {
          display: flex;
          justify-content: space-around;
          margin-top: 30px;
          border: 2px solid #333;
          padding: 20px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-number {
          font-size: 24px;
          font-weight: bold;
          display: block;
          margin-bottom: 5px;
        }
        .summary-label {
          font-size: 12px;
          text-transform: uppercase;
        }
        @media print {
          body { margin: 0; }
          .pagination-table { display: none !important; }
        }
      </style>
    </head>
    <body>
      <h2>${modalTitle}</h2>
      ${modalContent}
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
        Dicetak pada: ${new Date().toLocaleString("id-ID")}
      </div>
    </body>
    </html>`
  );
  win.document.close();
  win.print();
}

// RFID Handler integration
let memberRfidListening = false;
let borrowRfidListening = false;
let returnRfidListening = false;

function toggleBorrowInputMethod() {
  const method = document.querySelector(
    'input[name="borrowInputMethod"]:checked'
  ).value;
  const rfidBtn = document.getElementById("borrowRfidBtn");
  const statusElement = document.getElementById("borrowRfidStatus");

  if (method === "manual") {
    rfidBtn.style.display = "none";
    statusElement.textContent = "Status: Mode input manual aktif";
    statusElement.className = "rfid-status";
    borrowRfidListening = false;
  } else {
    rfidBtn.style.display = "block";
    statusElement.textContent = "Status: Menunggu tap kartu anggota...";
    statusElement.className = "rfid-status";
  }
}

function toggleReturnInputMethod() {
  const method = document.querySelector(
    'input[name="returnInputMethod"]:checked'
  ).value;
  const rfidBtn = document.getElementById("returnRfidBtn");
  const statusElement = document.getElementById("returnRfidStatus");

  if (method === "manual") {
    rfidBtn.style.display = "none";
    statusElement.textContent = "Status: Mode input manual aktif";
    statusElement.className = "rfid-status";
    returnRfidListening = false;
  } else {
    rfidBtn.style.display = "block";
    statusElement.textContent = "Status: Menunggu tap kartu anggota...";
    statusElement.className = "rfid-status";
  }
}

function enableRFIDForBorrow() {
  const statusElement = document.getElementById("borrowRfidStatus");
  const btnElement = document.getElementById("borrowRfidBtn");

  if (borrowRfidListening) {
    // Stop listening
    borrowRfidListening = false;
    statusElement.textContent = "Status: Menunggu tap kartu anggota...";
    statusElement.className = "rfid-status";
    btnElement.textContent = "📱 Tap Kartu";
    btnElement.classList.remove("btn-danger");
    return;
  }

  // Start listening
  borrowRfidListening = true;
  statusElement.textContent = "Status: Menunggu tap kartu RFID...";
  statusElement.className = "rfid-status waiting";
  btnElement.textContent = "⏹️ Stop";
  btnElement.classList.add("btn-danger");

  console.log("RFID listening enabled for borrow form");
}

function enableRFIDForReturn() {
  const statusElement = document.getElementById("returnRfidStatus");
  const btnElement = document.getElementById("returnRfidBtn");

  if (returnRfidListening) {
    // Stop listening
    returnRfidListening = false;
    statusElement.textContent = "Status: Menunggu tap kartu anggota...";
    statusElement.className = "rfid-status";
    btnElement.textContent = "📱 Tap Kartu";
    btnElement.classList.remove("btn-danger");
    return;
  }

  // Start listening
  returnRfidListening = true;
  statusElement.textContent = "Status: Menunggu tap kartu RFID...";
  statusElement.className = "rfid-status waiting";
  btnElement.textContent = "⏹️ Stop";
  btnElement.classList.add("btn-danger");

  console.log("RFID listening enabled for return form");
}

function enableRFIDForMember() {
  const statusElement = document.getElementById("memberRfidStatus");
  const btnElement = document.getElementById("memberRfidBtn");

  if (memberRfidListening) {
    // Stop listening
    memberRfidListening = false;
    statusElement.textContent = "Status: Siap untuk tap kartu";
    statusElement.className = "rfid-status";
    btnElement.textContent = "📱 Tap Kartu";
    btnElement.classList.remove("btn-danger");
    return;
  }

  // Start listening
  memberRfidListening = true;
  statusElement.textContent = "Status: Menunggu tap kartu RFID...";
  statusElement.className = "rfid-status waiting";
  btnElement.textContent = "⏹️ Stop";
  btnElement.classList.add("btn-danger");

  console.log("RFID listening enabled for member form");
}
function setupRFIDListener() {
  console.log("Setting up RFID listener...");

  // Listen to both current_rfid and Userdata for RFID scans
  const rfidRef = database.ref("current_rfid");
  const userdataRef = database.ref("Userdata");

  let lastProcessedUID = null;
  let lastProcessedTime = 0;

  // Function to process RFID data with debouncing
  function processRFIDData(uid) {
    const now = Date.now();
    if (uid === lastProcessedUID && now - lastProcessedTime < 2000) {
      console.log("Duplicate RFID scan ignored:", uid);
      return;
    }

    lastProcessedUID = uid;
    lastProcessedTime = now;

    console.log("Processing RFID data:", uid);
    handleRFIDData(uid);
  }

  // Listen to current_rfid for immediate scans
  rfidRef.on(
    "value",
    (snapshot) => {
      const data = snapshot.val();
      if (data && data.uid) {
        console.log("RFID data received from current_rfid:", data.uid);
        processRFIDData(data.uid);
      }
    },
    (error) => {
      console.error("Error in current_rfid listener:", error);
    }
  );

  // Listen to Userdata for new card readings
  userdataRef.on(
    "child_changed",
    (snapshot) => {
      const data = snapshot.val();
      if (data && data.readings) {
        // Get the latest reading
        const readings = data.readings;
        const readingKeys = Object.keys(readings).sort();
        const latestReadingKey = readingKeys[readingKeys.length - 1];
        const latestReading = readings[latestReadingKey];

        if (latestReading && latestReading.id_kartu) {
          console.log(
            "RFID data received from Userdata:",
            latestReading.id_kartu
          );
          processRFIDData(latestReading.id_kartu);
        }
      }
    },
    (error) => {
      console.error("Error in Userdata listener:", error);
    }
  );

  // Also listen for new children in Userdata
  userdataRef.on(
    "child_added",
    (snapshot) => {
      const data = snapshot.val();
      if (data && data.readings) {
        const readings = data.readings;
        const readingKeys = Object.keys(readings).sort();
        const latestReadingKey = readingKeys[readingKeys.length - 1];
        const latestReading = readings[latestReadingKey];

        if (latestReading && latestReading.id_kartu) {
          console.log("New RFID data from Userdata:", latestReading.id_kartu);
          processRFIDData(latestReading.id_kartu);
        }
      }
    },
    (error) => {
      console.error("Error in Userdata child_added listener:", error);
    }
  );
}

function handleRFIDData(uid) {
  console.log("Handling RFID data:", uid);

  if (!uid || uid.trim() === "") {
    console.log("Empty UID received, ignoring");
    return;
  }

  // Clean the UID
  uid = uid.trim();

  // Check which section is currently active
  const currentSection = getCurrentActiveSection();
  console.log("Current active section:", currentSection);

  // Handle RFID for Member Registration
  if (currentSection === "members" || memberRfidListening) {
    handleMemberRFID(uid);
    return;
  }

  // Handle RFID for Borrowing
  if (currentSection === "borrow" || borrowRfidListening) {
    handleBorrowRFID(uid);
    return;
  }

  // Handle RFID for Returning
  if (currentSection === "return" || returnRfidListening) {
    handleReturnRFID(uid);
    return;
  }

  console.log("No active section for RFID handling");
}

function getCurrentActiveSection() {
  const sections = [
    "dashboard",
    "books",
    "members",
    "borrow",
    "return",
    "reports",
    "settings",
  ];

  for (const section of sections) {
    const element = document.getElementById(section + "-section");
    if (element && !element.classList.contains("hidden")) {
      return section;
    }
  }
  return null;
}

function handleMemberRFID(uid) {
  console.log("Handling member RFID:", uid);

  const memberUIDInput = document.getElementById("memberUID");
  const statusElement = document.getElementById("memberRfidStatus");
  const btnElement = document.getElementById("memberRfidBtn");

  if (!memberUIDInput || !statusElement) {
    console.log("Member form elements not found");
    return;
  }

  // Check if UID already exists
  let uidExists = false;
  let existingMemberName = "";

  Object.values(allMembers || {}).forEach((member) => {
    if (member && member.uid === uid) {
      uidExists = true;
      existingMemberName = member.name;
    }
  });

  if (uidExists) {
    statusElement.textContent = `Status: UID sudah terdaftar untuk ${existingMemberName}!`;
    statusElement.className = "rfid-status error";
    statusElement.style.backgroundColor = "#f8d7da";
    statusElement.style.color = "#721c24";
  } else {
    memberUIDInput.value = uid;
    statusElement.textContent = `Status: UID berhasil dibaca - ${uid}`;
    statusElement.className = "rfid-status success";
    statusElement.style.backgroundColor = "#d4edda";
    statusElement.style.color = "#155724";

    // Focus on the name field
    const nameField = document.getElementById("memberName");
    if (nameField) {
      setTimeout(() => nameField.focus(), 100);
    }
  }

  // Stop listening if was actively listening
  if (memberRfidListening) {
    memberRfidListening = false;
    if (btnElement) {
      btnElement.textContent = "📱 Tap Kartu";
      btnElement.classList.remove("btn-danger");
    }
  }

  // Reset status after 5 seconds
  setTimeout(() => {
    if (statusElement) {
      statusElement.textContent = "Status: Siap untuk tap kartu";
      statusElement.className = "rfid-status";
      statusElement.style.backgroundColor = "";
      statusElement.style.color = "";
    }
  }, 5000);
}

function handleBorrowRFID(uid) {
  console.log("Handling borrow RFID:", uid);

  const borrowUIDInput = document.getElementById("borrowUID");
  const statusElement = document.getElementById("borrowRfidStatus");
  const btnElement = document.getElementById("borrowRfidBtn");

  if (!borrowUIDInput || !statusElement) {
    console.log("Borrow form elements not found");
    return;
  }

  // Set the UID
  borrowUIDInput.value = uid;

  // Check if member exists
  let memberFound = false;
  let memberName = "";

  Object.values(allMembers || {}).forEach((member) => {
    if (member && member.uid === uid) {
      memberFound = true;
      memberName = member.name;
    }
  });

  if (memberFound) {
    statusElement.textContent = `Status: Anggota ditemukan - ${memberName}`;
    statusElement.className = "rfid-status success";
    statusElement.style.backgroundColor = "#d4edda";
    statusElement.style.color = "#155724";

    // Automatically verify the UID
    setTimeout(() => verifyBorrowUID(), 500);
  } else {
    statusElement.textContent = `Status: UID ${uid} tidak terdaftar!`;
    statusElement.className = "rfid-status error";
    statusElement.style.backgroundColor = "#f8d7da";
    statusElement.style.color = "#721c24";
  }

  // Stop listening if was actively listening
  if (borrowRfidListening) {
    borrowRfidListening = false;
    if (btnElement) {
      btnElement.textContent = "📱 Tap Kartu";
      btnElement.classList.remove("btn-danger");
    }
  }

  // Reset status after 5 seconds if member not found
  if (!memberFound) {
    setTimeout(() => {
      if (statusElement) {
        statusElement.textContent = "Status: Menunggu tap kartu anggota...";
        statusElement.className = "rfid-status";
        statusElement.style.backgroundColor = "";
        statusElement.style.color = "";
      }
    }, 5000);
  }
}

function handleReturnRFID(uid) {
  console.log("Handling return RFID:", uid);

  const returnUIDInput = document.getElementById("returnUID");
  const statusElement = document.getElementById("returnRfidStatus");
  const btnElement = document.getElementById("returnRfidBtn");

  if (!returnUIDInput || !statusElement) {
    console.log("Return form elements not found");
    return;
  }

  // Set the UID
  returnUIDInput.value = uid;

  // Check if member exists
  let memberFound = false;
  let memberName = "";

  Object.values(allMembers || {}).forEach((member) => {
    if (member && member.uid === uid) {
      memberFound = true;
      memberName = member.name;
    }
  });

  if (memberFound) {
    statusElement.textContent = `Status: Anggota ditemukan - ${memberName}`;
    statusElement.className = "rfid-status success";
    statusElement.style.backgroundColor = "#d4edda";
    statusElement.style.color = "#155724";

    // Automatically load member for return
    setTimeout(() => loadMemberForReturn(), 500);
  } else {
    statusElement.textContent = `Status: UID ${uid} tidak terdaftar!`;
    statusElement.className = "rfid-status error";
    statusElement.style.backgroundColor = "#f8d7da";
    statusElement.style.color = "#721c24";
  }

  // Stop listening if was actively listening
  if (returnRfidListening) {
    returnRfidListening = false;
    if (btnElement) {
      btnElement.textContent = "📱 Tap Kartu";
      btnElement.classList.remove("btn-danger");
    }
  }

  // Reset status after 5 seconds if member not found
  if (!memberFound) {
    setTimeout(() => {
      if (statusElement) {
        statusElement.textContent = "Status: Menunggu tap kartu anggota...";
        statusElement.className = "rfid-status";
        statusElement.style.backgroundColor = "";
        statusElement.style.color = "";
      }
    }, 5000);
  }
}
