/**
 * LuxMail Agent - E2E Integration Simulation Script
 * 
 * This script sends mock email scenarios to the local LuxMail daemon (localhost:3000)
 * to test the AI classification and WhatsApp notification pipeline without needing 
 * to fetch real emails from an IMAP server.
 * 
 * Usage:
 *   1. Start the daemon (e.g., `npm run start:service` or `npm run dev`)
 *   2. Run `node tests/simulate_email.js`
 */

const DAEMON_URL = 'http://localhost:3000/api/test/inject-email';

const SCENARIOS = [
  {
    name: '1. Priority Job Interview Invitation',
    payload: {
      sender: 'Google Careers <careers-noreply@google.com>',
      subject: 'Interview Schedule: Felix Iniguez // Software Engineer (SaaS & IoT)',
      body: 'Hi Felix, we reviewed your profile as SaaS Architect for Luxnode and would love to move forward. We invite you to schedule a 60-minute coding interview this week. Please click the link to choose a slot on Calendly.'
    }
  },
  {
    name: '2. Formal Rejection Letter',
    payload: {
      sender: 'HR Team <hr@startup-example.com>',
      subject: 'Your application for Senior Full Stack role',
      body: 'Hi Felix, thank you for taking the time to talk with us. Although your experience with NestJS and Edge Computing is impressive, we have chosen to proceed with another candidate whose skillset more closely matches the profile we need. We will keep your resume on file.'
    }
  },
  {
    name: '3. Newsletter Spam',
    payload: {
      sender: 'Mega Offers <promo@sales-blast.net>',
      subject: 'URGENT: Cloud Hosting at 95% Discount!',
      body: 'Hurry up! Save big on cloud compute VPS servers today only. Starting at $0.49/mo. Click here to purchase now!'
    }
  }
];

async function runSimulation() {
  console.log('🚀 Starting LuxMail Agent email simulation tests...\n');

  for (const scenario of SCENARIOS) {
    console.log(`Sending scenario: [${scenario.name}]...`);
    try {
      const response = await fetch(DAEMON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario.payload)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Success:', result.message);
        if (result.classification) {
          console.log('   AI Classification:', JSON.stringify(result.classification, null, 2));
        }
      } else {
        console.log('❌ Failed:', result.error || response.statusText);
      }
    } catch (err) {
      console.log('❌ Error: Could not connect to daemon. Is it running on http://localhost:3000?');
    }
    console.log('--------------------------------------------------\n');
  }

  console.log('🏁 Simulation runs complete.');
}

runSimulation();
