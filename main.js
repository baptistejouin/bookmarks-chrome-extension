const DOMbody = document.querySelector("body");
const rootDetails = document.querySelector("#js-root-details");
const linkTemplate = document.querySelector("#js-link-template");
const folderTemplate = document.querySelector("#js-folder-template");
const reduceFolder = document.querySelector("#js-reduce-folder");
const togglePrefersColorScheme = document.querySelector(
  "#js-toggle-prefers-color-scheme"
);

let openFolders = JSON.parse(localStorage.getItem("openFolder")) || [];

function createAnchor(bookmarkItem) {
  const linkElement = document.importNode(
    linkTemplate.content,
    true
  ).firstElementChild;
  const link = linkElement.querySelector("a");
  link.textContent = bookmarkItem.title || bookmarkItem.url;
  link.setAttribute("href", bookmarkItem.url);
  link.setAttribute("title", bookmarkItem.url);

  return linkElement;
}

function createFolder(bookmarkItem) {
  let folderElement = document.importNode(
    folderTemplate.content,
    true
  ).firstElementChild;
  const summary = folderElement.querySelector("summary");
  const details = folderElement.querySelector("details");
  summary.textContent =
    bookmarkItem.id == 0 ? "Root" : bookmarkItem.title || "Unnamed folder";

  if (openFolders.includes(bookmarkItem.id)) {
    details.setAttribute("open", true);
    details.dataset.isOpen = true;
  } else {
    details.dataset.isOpen = false;
  }

  summary.addEventListener("click", () => {
    details.dataset.isOpen === "true"
      ? closeFolder(bookmarkItem.id)
      : openFolder(bookmarkItem.id);
    details.dataset.isOpen = details.dataset.isOpen === "true" ? false : true;
  });

  return folderElement;
}

function saveToLocalStorage(tag, data) {
  localStorage.setItem(tag, JSON.stringify(data));
}

function openFolder(id) {
  console.log("open folder:", id);
  openFolders = [...openFolders, id];
  saveToLocalStorage("openFolder", openFolders);
}

function closeFolder(id) {
  console.log("close folder:", id);
  openFolders = openFolders.filter((item) => item !== id);
  saveToLocalStorage("openFolder", openFolders);
}

function displayBookmarkFolder(bookmarkItem, parentFolder) {
  const parentList = parentFolder.querySelector("ul");

  if (bookmarkItem.url) {
    const newAnchorLink = createAnchor(bookmarkItem);
    parentList.appendChild(newAnchorLink);
  } else {
    const newFolder = createFolder(bookmarkItem);
    parentList.appendChild(newFolder);
    parentFolder = newFolder;
  }

  if (bookmarkItem.children) {
    for (let child of bookmarkItem.children) {
      displayBookmarkFolder(child, parentFolder);
    }
  }
}

function displayBookmarkTree(bookmarks) {
  displayBookmarkFolder(bookmarks[0], rootDetails);
}

async function getBookmarkTree() {
  const timestampOfMostRecentBookmark =
    await getTimestampOfMostRecentBookmark();

  chrome.bookmarks.getTree((bookmarks) => {
    displayBookmarkTree(bookmarks);
    saveToLocalStorage("bookmarks", bookmarks);
    saveToLocalStorage("dateOfLastBookmark", timestampOfMostRecentBookmark);
  });
}

function getBookmarkTreeFromCache() {
  const cachedBookmarks = JSON.parse(localStorage.getItem("bookmarks"));
  displayBookmarkTree(cachedBookmarks);
}

async function getTimestampOfMostRecentBookmark() {
  const recentBookmark = await chrome.bookmarks.getRecent(1);
  return recentBookmark[0].dateAdded;
}

function timeDifference(date) {
  const dateOfLastBookmark = JSON.parse(
    localStorage.getItem("dateOfLastBookmark")
  );
  return dateOfLastBookmark - date === 0;
}

async function bookmarksIsUpToDate() {
  const timestampOfMostRecentBookmark =
    await getTimestampOfMostRecentBookmark();
  return timeDifference(timestampOfMostRecentBookmark);
}

async function init() {
  const hasCachedBookmarks = !!localStorage.getItem("bookmarks");
  const hasDateOfLastBookmark = !!localStorage.getItem("dateOfLastBookmark");
  const isUpToDate = await bookmarksIsUpToDate();

  if (hasCachedBookmarks && hasDateOfLastBookmark && isUpToDate) {
    // TODO: handle onDelete/onRename...

    console.info("from cache");
    return getBookmarkTreeFromCache();
  }
  console.info("refresh !");
  getBookmarkTree();
}

function closeAllFolder() {
  saveToLocalStorage("openFolder", []);
  openFolders.forEach((folderId) => {
    closeFolder(folderId);
  });
  document.querySelectorAll("details").forEach((detail) => {
    detail.removeAttribute("open");
    detail.dataset.isOpen = false;
  });
}

function toggleColorScheme() {
  DOMbody.classList.contains("dark-theme")
    ? localStorage.setItem("prefersColorScheme", 0)
    : localStorage.setItem("prefersColorScheme", 1);
  DOMbody.classList.toggle("dark-theme");
}

init();

if (JSON.parse(localStorage.getItem("prefersColorScheme")) === 1) {
  toggleColorScheme();
}

reduceFolder.addEventListener("click", closeAllFolder);
togglePrefersColorScheme.addEventListener("click", toggleColorScheme);
