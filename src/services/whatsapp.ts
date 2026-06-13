const API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

// Nome dell'istanza principale (usiamo FIXLAB_TEST per evitare conflitti)
export const WA_INSTANCE = "FIXLAB_TEST"; 

/**
 * Crea il testo del messaggio per il cliente
 */
export const buildReadyMessage = (nomeCliente: string, prodotto: string) => {
  return `Ciao ${nomeCliente}! 👋 La riparazione del tuo ${prodotto} è terminata. Puoi passare a ritirarlo quando vuoi!`;
};

/**
 * Invia un messaggio di testo
 */
export const sendTextMessage = async (number: string, text: string) => {
  try {
    let cleanNumber = number.replace(/\D/g, "");
    
    if (!cleanNumber.startsWith('39')) {
      cleanNumber = `39${cleanNumber}`;
    }

    const response = await fetch(`${API_URL}/message/sendText/${WA_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        number: cleanNumber,
        options: {
          delay: 1200,
          presence: "composing"
        },
        textMessage: {
          text: text
        }
      })
    });

    return await response.json();
  } catch (error) {
    console.error("Errore invio messaggio WhatsApp:", error);
    throw error;
  }
};

/**
 * CREAZIONE ISTANZA (Usa Authorization Bearer per Evolution API v2.2.3)
 */
export const createWhatsAppInstance = async (instanceName: string) => {
  try {
    const response = await fetch(`${API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: API_KEY,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Errore risposta Evolution API:", errorData);
      throw new Error(`Errore creazione istanza: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Risposta creazione istanza:", data);
    return data;
  } catch (error) {
    console.error("Errore critico creazione istanza:", error);
    throw error;
  }
};

/**
 * OTTIENI QR CODE dell'istanza
 */
export const getQRCode = async (instanceName: string) => {
  try {
    const response = await fetch(`${API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    const data = await response.json();
    console.log("Dati istanza (QR Code):", data);
    return data;
  } catch (error) {
    console.error("Errore recupero QR Code:", error);
    throw error;
  }
};

/**
 * RESET ISTANZA (Da usare se il QR Code non appare)
 */
export const logoutInstance = async (instanceName: string = WA_INSTANCE) => {
  try {
    // Prima fai logout
    await fetch(`${API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    // Poi elimina l'istanza
    await fetch(`${API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    console.log(`Istanza ${instanceName} resettata con successo`);
  } catch (e) {
    console.error("Errore durante il reset dell'istanza:", e);
  }
};

/**
 * VERIFICA STATO ISTANZA
 */
export const getInstanceStatus = async (instanceName: string = WA_INSTANCE) => {
  try {
    const response = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    const data = await response.json();
    console.log("Stato connessione istanza:", data);
    return data;
  } catch (error) {
    console.error("Errore recupero stato istanza:", error);
    throw error;
  }
};