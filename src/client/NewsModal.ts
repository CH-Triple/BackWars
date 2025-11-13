import { LitElement, css, html } from "lit";
import { resolveMarkdown } from "lit-markdown";
import { customElement, property, query } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";

@customElement("news-modal")
export class NewsModal extends LitElement {
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

  private manualChangelog: string = `
# 📰 Update v0.1
Modded by **CHTriple** & **FreshFlash**
`;

  @property({ type: String }) markdown = this.manualChangelog;
  private initialized: boolean = false;

  static styles = css`
    :host {
      display: block;
    }

    .news-container {
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .news-content {
      color: #ddd;
      line-height: 1.5;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 1rem;
    }

    .news-content a {
      color: #4a9eff !important;
      text-decoration: underline !important;
      transition: color 0.2s ease;
    }

    .news-content a:hover {
      color: #6fb3ff !important;
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
      <o-modal title=${translateText("news.title")}>
        <div class="options-layout">
          <div class="options-section">
            <div class="news-container">
              <div class="news-content">
                ${resolveMarkdown(this.markdown, {
                  includeImages: true,
                  includeCodeBlockClassNames: true,
                })}
              </div>
            </div>
          </div>
        </div>
      </modal>
    `;
  }

  public open() {
    if (!this.initialized) {
      this.initialized = true;
      this.markdown = this.manualChangelog;
    }
    this.requestUpdate();
    this.modalEl?.open();
  }

  private close() {
    this.modalEl?.close();
  }
}
