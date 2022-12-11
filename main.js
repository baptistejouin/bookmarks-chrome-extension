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

  if (openFolders.includes(bookmarkItem.id)) details.setAttribute("open", true);

  summary.addEventListener("click", () => {
    details.getAttribute("open")
      ? closeFolder(bookmarkItem.id)
      : openFolder(bookmarkItem.id);
  });

  return folderElement;
}

function saveToLocalStorage(tag, data) {
  localStorage.setItem(tag, JSON.stringify(data));
}

function openFolder(id) {
  openFolders = [...openFolders, id];
  saveToLocalStorage("openFolder", openFolders);
}

function closeFolder(id) {
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
  openFolders = [];
  localStorage.clear("bookmarks");
  document
    .querySelectorAll("details")
    .forEach((detail) => detail.removeAttribute("open"));
}

function toggleColorScheme() {
  DOMbody.classList.contains("dark-theme")
    ? localStorage.setItem("prefersColorScheme", 0)
    : localStorage.setItem("prefersColorScheme", 1);
  DOMbody.classList.toggle("dark-theme");
}

// function timeOnTitle() {
//   const now = new Date();
//   const hours = `${now.getHours()}`.padStart(2, "0");
//   const minutes = `${now.getMinutes()}`.padStart(2, "0");
//   const seconds = `${now.getSeconds()}`.padStart(2, "0");
//   document.title = `New tab - ${hours}:${minutes}:${seconds}`;
// }

init();
// timeOnTitle();

if (JSON.parse(localStorage.getItem("prefersColorScheme")) === 1) {
  toggleColorScheme();
}

// let timer = setInterval(() => {
//   timeOnTitle();
// }, 1000);

reduceFolder.addEventListener("click", closeAllFolder);
togglePrefersColorScheme.addEventListener("click", toggleColorScheme);
