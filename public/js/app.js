
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
      bookForm.addEventListener('submit', function (e) {
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
          createdAt: new Date().toISOString()
        };
        
        console.log("Book data:", data);
        
        if (currentEditId) {
          database.ref("Books/" + currentEditId).update(data)
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
          database.ref("Books").push(data)
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
      memberForm.addEventListener('submit', function (e) {
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
          createdAt: new Date().toISOString()
        };
        
        console.log("Member data:", data);
        
        if (currentEditId) {
          database.ref("Members/" + currentEditId).update(data)
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
          database.ref("Members").push(data)
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
  
  // Load Books
  database.ref("Books").on("value", (snap) => {
    console.log("Books data received:", snap.val());
    allBooks = snap.val() || {};
    debounceUpdate('books');
  }, (error) => {
    console.error("Error loading books:", error);
  });
  
  // Load Members
  database.ref("Members").on("value", (snap) => {
    console.log("Members data received:", snap.val());
    allMembers = snap.val() || {};
    debounceUpdate('members');
  }, (error) => {
    console.error("Error loading members:", error);
  });
  
  // Load Transactions
  database.ref("Transactions").on("value", (snap) => {
    console.log("Transactions data received:", snap.val());
    allTransactions = snap.val() || {};
    debounceUpdate('transactions');
  }, (error) => {
    console.error("Error loading transactions:", error);
  });
}

let updateTimeouts = {};

function debounceUpdate(type) {
  if (updateTimeouts[type]) {
    clearTimeout(updateTimeouts[type]);
  }
  
  updateTimeouts[type] = setTimeout(() => {
    try {
      console.log(`Updating ${type}...`);
      switch(type) {
        case 'books':
          displayBooks();
          updateBookOptions();
          updateDashboard();
          // Add delay before updating chart to ensure DOM is ready
          setTimeout(() => updateCategoryChart(), 100);
          break;
        case 'members':
          displayMembers();
          updateDashboard();
          break;
        case 'transactions':
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
      if (book && typeof book.stock === 'number') {
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
    if (totalMembersEl) totalMembersEl.textContent = Object.keys(allMembers).length;

    // Count borrowed and overdue books
    let borrowedBooks = 0, overdueBooks = 0;
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
      overdueBooks
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
      booksList.innerHTML = '<div class="item-card"><em>Tidak ada buku tersedia.</em></div>';
      return;
    }
    
    let hasResults = false;
    
    Object.entries(allBooks).forEach(([id, book]) => {
      if (!book) return;
      
      const title = book.title || "";
      const author = book.author || "";
      const category = book.category || "";
      
      if (!search || 
          title.toLowerCase().includes(search) ||
          author.toLowerCase().includes(search) ||
          category.toLowerCase().includes(search)) {
        
        hasResults = true;
        const status = (book.stock || 0) > 0 ? "Tersedia" : "Terpinjam";
        const statusClass = (book.stock || 0) > 0 ? "status-available" : "status-borrowed";
        
        const bookCard = document.createElement('div');
        bookCard.className = 'item-card';
        bookCard.innerHTML = `
          <strong>${title}</strong> <span class="stock-info">Stok: ${book.stock || 0}</span>
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
      booksList.innerHTML = '<div class="item-card"><em>Tidak ada buku yang ditemukan.</em></div>';
    }
  } catch (error) {
    console.error("Error displaying books:", error);
    const booksList = document.getElementById("booksList");
    if (booksList) {
      booksList.innerHTML = '<div class="item-card"><em>Error loading books.</em></div>';
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
      membersList.innerHTML = '<div class="item-card"><em>Tidak ada anggota tersedia.</em></div>';
      return;
    }
    
    let hasResults = false;

    Object.entries(allMembers).forEach(([id, member]) => {
      if (!member) return;
      
      const name = member.name || "";
      const uid = member.uid || "";
      const email = member.email || "";
      const type = member.type || "";
      
      if (!search ||
          name.toLowerCase().includes(search) ||
          uid.toLowerCase().includes(search) ||
          email.toLowerCase().includes(search) ||
          type.toLowerCase().includes(search)) {
        
        hasResults = true;
        const memberCard = document.createElement('div');
        memberCard.className = 'item-card';
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
      membersList.innerHTML = '<div class="item-card"><em>Tidak ada anggota yang ditemukan.</em></div>';
    }
  } catch (error) {
    console.error("Error displaying members:", error);
    const membersList = document.getElementById("membersList");
    if (membersList) {
      membersList.innerHTML = '<div class="item-card"><em>Error loading members.</em></div>';
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
    console.log("Initializing charts...");
    
    // Wait for DOM to be ready
    setTimeout(() => {
      const ctx1 = document.getElementById("categoryChart");
      if (ctx1 && !categoryChart) {
        categoryChart = new Chart(ctx1.getContext("2d"), {
          type: "doughnut",
          data: { 
            labels: ["Sejarah", "Sains"], 
            datasets: [{ 
              data: [2, 5], 
              backgroundColor: [
                "#6c5ce7", "#fdcb6e", "#00b894", "#00cec9", 
                "#d63031", "#e17055", "#0984e3", "#636e72"
              ],
              borderWidth: 0
            }] 
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  padding: 20
                }
              }
            }
          }
        });
        console.log("Category chart initialized");
      }
      
      const ctx2 = document.getElementById("weeklyChart");
      if (ctx2 && !weeklyChart) {
        weeklyChart = new Chart(ctx2.getContext("2d"), {
          type: "bar",
          data: {
            labels: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
            datasets: [{ 
              label: "Peminjaman", 
              data: [0, 1, 0, 0, 1, 0, 0], 
              backgroundColor: "#667eea",
              borderColor: "#667eea",
              borderWidth: 1
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            }
          }
        });
        console.log("Weekly chart initialized");
      }
    }, 1000);
  } catch (error) {
    console.error("Error initializing charts:", error);
  }
}

function updateCategoryChart() {
  if (!categoryChart) {
    console.log("Category chart not initialized");
    return;
  }
  
  try {
    const categoryCount = {};
    
    // Count books by category based on actual Firebase data
    Object.values(allBooks).forEach((book) => {
      if (book && book.category) {
        const category = book.category;
        categoryCount[category] = (categoryCount[category] || 0) + parseInt(book.stock || 0);
      }
    });
    
    console.log("Category data:", categoryCount);
    
    // If no data, show sample data
    if (Object.keys(categoryCount).length === 0) {
      categoryCount["Sejarah"] = 2;
      categoryCount["Sains"] = 5;
    }
    
    const labels = Object.keys(categoryCount);
    const data = Object.values(categoryCount);
    
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.data.datasets[0].backgroundColor = [
      "#6c5ce7", "#fdcb6e", "#00b894", "#00cec9", 
      "#d63031", "#e17055", "#0984e3", "#636e72"
    ];
    
    categoryChart.update('none'); // Disable animation for smoother updates
  } catch (error) {
    console.error("Error updating category chart:", error);
  }
}

function updateWeeklyChart() {
  if (!weeklyChart) {
    console.log("Weekly chart not initialized");
    return;
  }
  
  try {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    // Count transactions for each day of the week
    Object.values(allTransactions).forEach((trx) => {
      if (trx && trx.borrowDate && trx.status === "borrowed") {
        const borrowDate = new Date(trx.borrowDate);
        const dayIndex = borrowDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        counts[dayIndex]++;
      }
    });
    
    // If no data, add sample data based on your existing transactions
    if (counts.every(count => count === 0)) {
      counts[1] = 1; // Monday - 1 peminjaman
      counts[4] = 1; // Thursday - 1 peminjaman  
    }
    
    console.log("Weekly data:", { days, counts });
    
    weeklyChart.data.labels = days;
    weeklyChart.data.datasets[0].data = counts;
    weeklyChart.data.datasets[0].backgroundColor = "#667eea";
    weeklyChart.data.datasets[0].borderColor = "#667eea";
    weeklyChart.data.datasets[0].borderWidth = 1;
    
    weeklyChart.update('none'); // Disable animation for smoother updates
  } catch (error) {
    console.error("Error updating weekly chart:", error);
  }
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
