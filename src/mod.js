console.log(
  "%c>>> LOADED BackWars Mod <<<",
  "font-size: 28px; font-weight: 900; color:red; padding: 8px 16px;",
);

console.log("%cConsole modded by CHTriple", "font-size: 20px");

// --- WIN MODAL TRIGGER ---
window.openWinModal = function () {
  const winModal = document.querySelector("win-modal");
  if (!winModal) {
    console.error("WinModal element not found!");
    return;
  }

  winModal.isVisible = true;
  winModal.showButtons = true;
  winModal._title = "You Win!";

  console.log("%cWin Modal opened!", "color: lime; font-size: 16px;");
};

// --- SHOP MODAL TRIGGER ---
window.openShopModal = function () {
  const modal = document.querySelector("shop-modal");
  if (!modal) {
    console.error("ShopModal element not found!");
    return;
  }

  if (typeof modal.open === "function") {
    modal.open();
  } else if (modal.shadowRoot) {
    const shopInstance = modal;
    if (shopInstance.open) shopInstance.open();
    else console.error("ShopModal internal open() not found!");
  } else {
    console.error("ShopModal method 'open' not found!");
  }
};
