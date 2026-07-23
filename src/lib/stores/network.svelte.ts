import { writable } from "svelte/store"

export const isOnline = writable(false);

async function checkOnlineStatus() {
    const address = "https://www.gstatic.com/generate_204";
    try {
        await fetch(address, { mode: "no-cors" });
        isOnline.set(true)
    } catch {
        isOnline.set(false)
    }
}
checkOnlineStatus()

setInterval(checkOnlineStatus, 5000);