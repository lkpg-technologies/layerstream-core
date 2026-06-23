const Network = {
  ping: async function (callback: Function, sleep: number=3000, maxTries?: number) {
    let interval: any;
    let tries = 0;
    const address = "https://www.gstatic.com/generate_204";

    const testConnection = async () => {
      try {
        await fetch(address, { mode: "no-cors" });
        clearInterval(interval);
        return true;
      } catch {
        return false;
      }
    }

    interval = setInterval(async function() { 
      tries++;
      callback(await testConnection())
      if (maxTries && maxTries <= tries) {
        clearInterval(interval);
        callback(false);
      }
    }, sleep);

    callback(await testConnection())

  },
}


export default Network