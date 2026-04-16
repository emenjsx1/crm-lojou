
import axios from 'axios';

async function setup() {
  try {
    const res = await axios.post('https://porta0control-evolution-api.ddlesd.easypanel.host/webhook/set/lojou-crw', {
      webhook: {
        url: 'https://crm.admin.lojou.app/api/webhook/evolution',
        enabled: true,
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'MESSAGES_SET']
      }
    }, {
      headers: {
        'apikey': '429683C4C977415CAAFCCE10F7D57E11',
        'Content-Type': 'application/json'
      }
    });
    console.log('Webhook Configured:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

setup();
