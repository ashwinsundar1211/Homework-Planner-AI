// Service worker registration and the "Install app" button.

let installPrompt = null;

function getInstallButton() {
  return document.getElementById("install-btn");
}

export function initPwa() {
  const installButton = getInstallButton();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        // Offline support is optional; the planner keeps working online.
      });
    });
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    installButton.hidden = true;
  });

  installButton.addEventListener("click", async function () {
    if (!installPrompt) {
      return;
    }

    try {
      installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      // The dialog can only open from a real tap; ignore otherwise.
    }

    installPrompt = null;
    installButton.hidden = true;
  });
}
