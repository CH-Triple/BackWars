// src/client/ShopModal.ts
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";

@customElement("shop-modal")
export class ShopModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  @property({ type: String }) title = "Shop";
  @property({ type: Boolean }) initialized = false;

  static styles = css`
    :host {
      display: block;
    }

    .shop-container {
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .shop-content {
      color: #ddd;
      line-height: 1.5;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    button {
      display: block;
      margin: 1.5rem auto 0 auto;
      width: 160px;
      padding: 0.6rem 1rem;
      text-align: center;
      font-size: 1rem;
      font-weight: 500;
      color: #fff;
      background-color: #4a9eff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    button:hover {
      background-color: #6fb3ff;
    }

    button:active {
      background-color: #3a8de0;
    }
  `;

  render() {
    return html`
      <o-modal title=${translateText("shop.title")}>
        <div class="shop-container">
          <div class="shop-content">
            Der Shop ist noch leer – Items kommen später.
          </div>
          <button @click="${this.close}">Schließen</button>
        </div>
      </o-modal>
    `;
  }

  public open() {
    if (!this.initialized) {
      this.initialized = true;
    }
    this.requestUpdate();
    this.modalEl?.open();
    console.log("%cShop Modal opened!", "color: lime; font-size: 16px;");
  }

  private close() {
    this.modalEl?.close();
  }
}
