// ==UserScript==
// @name         Leitura Automática de Pedidos - Geraldo <aiqfome>
// @version      2.2.1V-ATT
// @description  Este userscript adiciona a opção de leitura automática dos pedidos para os restaurantes no Geraldo <aiqfome>.
// @author       Renan D.
// @supportURL   https://gist.github.com/renandecarlo/3b83a47bccda033e73e3f76f2300ae8c/
// @updateURL    https://gist.github.com/renandecarlo/3b83a47bccda033e73e3f76f2300ae8c/raw/aiqfome-geraldo-autoRead.user.js
// @downloadURL  https://gist.github.com/renandecarlo/3b83a47bccda033e73e3f76f2300ae8c/raw/aiqfome-geraldo-autoRead.user.js
// @match        *://geraldo-restaurantes.aiqfome.com/*
// @resource     style https://gist.github.com/renandecarlo/3b83a47bccda033e73e3f76f2300ae8c/raw/aiqfome-geraldo-autoRead.style.css
// @icon         https://www.google.com/s2/favicons?domain=aiqfome.com
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @run-at       document-end
// ==/UserScript==
// Ajustado 15/11/2024 me desculpe Renan caso você encontre isso eu só ajustei

(async function() {
    "use strict";

    /* Use workers for setInterval and setTimeout to avoid chrome throttling when in background */
    const workerTimer = await import("https://cdn.jsdelivr.net/npm/worker-timers@7.0.63/+esm");

    //  window.setTimeout = workerTimer.setTimeout;
    //  window.setInterval = workerTimer.setInterval;

    /* Add custom style */
    const style = GM_getResourceText("style");
    GM_addStyle(style);

    let lastReload = new Date;
    const readOrder = async () => {
        if(/\/pedidos.*/.test(location.pathname)) { /* Check if it's on orders page */

            if(lastReload < new Date - 60 * 2 * 1000) /* Reload page after 2 minutes to avoid stuck socket connections */
                return window.location.reload();

            /* Check if it's on or off */
            let state = getButtonState();

            if(state == "on") {
                console.log("Looking for new orders...");

                /* Read last order */
                let lastOrder = document.querySelector("#novo-pedidos .container-pedido:last-child");

                if(lastOrder) {
                    let readButton = lastOrder.querySelector(".btn-ler-pedido");
                    readButton.click();

                    /* Wait for print button to appear and then print */
                    const print = await waitForElm(".btn-impressao > div:nth-child(2) > button");

                    await new Promise(resolve => workerTimer.setTimeout(resolve, 5000)); /* Wait +5 seconds */

                    print.click();

                    /* Close modal */
                    return workerTimer.setTimeout(() => {
                        document.querySelector(".mdi-close").click();

                        /**
                         * It seems aiq doesn't properly close the modal when the tab is in background, so we reload the page instead
                         */
                        workerTimer.setTimeout(() => {
                            console.log('Reloading...');
                            window.location.reload();
                        }, 1000);
                    }, 1000);

                }
            }

        }

        workerTimer.setTimeout(readOrder, 5000);
    }

   const addButton = async () => {
    // Criação do botão
    let autoreadButton = `
        <button class="btn btn-autoler-pagina">
            <i class="mdi mdi-robot"></i>
            <span>ler automat.</span>
            <label class="vue-js-switch toggled">
                <div class="v-switch-core">
                    <div class="v-switch-button toggled"></div>
                </div>
            </label>
        </button>
    `;

    // Encontra o contêiner do botão "Ir para"
    const irParaButton = await waitForElm(".btn-dropdown"); // Ajustado para o contêiner correto
    irParaButton.insertAdjacentHTML("afterend", autoreadButton); // Insere logo após o botão "Ir para"

    // Adiciona evento ao botão
    document.querySelector(".btn-autoler-pagina").addEventListener("click", buttonToggle);

    setButtonState();
};
    const buttonToggle = (event) => {
        let state = getButtonState();

        if(state == 'on') setButtonState('off');
        else setButtonState('on');

        event.stopPropagation();
        event.preventDefault();
    }

    const getButtonState = () => {
        return localStorage.getItem('autoreadButtonState') || 'on';
    }

    const setButtonState = (state) => {
        let switchButton = document.querySelector(".btn-autoler-pagina .vue-js-switch");
        state = state || getButtonState();

        if(state == 'on')
            switchButton.classList.add('toggled');
        else
            switchButton.classList.remove('toggled');

        localStorage.setItem('autoreadButtonState', state);
    }

    const waitForElm = (selector) => {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    addButton();
    readOrder();
})();
