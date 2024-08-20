require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const { Telegraf } = require('telegraf');
const asyncLock = require('async-lock');

const app = express();
const lock = new asyncLock();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = 'mongodb+srv://gajahduduk1808:8XeFPleyitphQgHD@nawalachecker.tcdh0.mongodb.net/?retryWrites=true&w=majority&appName=nawalachecker';
const CACHE_KEY = 'https://raw.githubusercontent.com/Skiddle-ID/blocklist/main/domains';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}


// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Define User schema and model
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: String,
  password: String,
  singleDomainUrls: [{ domain: String, status: String, lastChecked: String }], // For login.html
  bulkDomainUrls: [{ domain: String, status: String }] // For bulk.html
});

const User = mongoose.model('User', UserSchema);

app.use(express.json());
app.use(express.static('public'));

let domainList = [];

async function fetchDomainList() {
  try {
    const response = await axios.get(CACHE_KEY);
    if (response.status === 200) {
      domainList = response.data.split('\n').map(domain => domain.trim()).filter(Boolean);
      console.log('Domain list fetched successfully:', domainList);
    } else {
      console.error('Failed to fetch domain list:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error fetching domain list:', error);
  }
}

// Fetch the domain list initially
fetchDomainList();

// Function to check domain status
function checkDomainStatus(domain) {
  domain = domain.replace(/\s+/g, '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  return domainList.includes(domain) ? 'Blocked' : 'Not Blocked';
}

// Function to send Telegram notification
async function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    console.log("Sending notification to Telegram:", message);  // Tambahkan log ini
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
    console.log("Notification sent successfully.");
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

// Telegram bot command handler for /ceklink
bot.command('ceklink', async (ctx) => {
  const commandParts = ctx.message.text.split(' ');
  if (commandParts.length < 2) {
    return ctx.reply('Usage: /ceklink <domain>');
  }

  const domain = commandParts[1];

  try {
    const status = checkDomainStatus(domain);
    if (status === 'Blocked') {
      await sendTelegramNotification(`Domain ${domain} ⛔ NAWALA ⛔ Segera ganti!`);
      ctx.reply(`Domain ${domain} ⛔ NAWALA ⛔ Segera ganti.`);
    } else {
      ctx.reply(`Domain ${domain} Masih Aman Bosqu✅.`);
    }
  } catch (error) {
    console.error('Error checking domain status:', error);
    ctx.reply('An error occurred while checking the domain status. Please try again later.');
  }
});

// Tambahkan handler untuk /cek
bot.command('cek', async (ctx) => {
  const commandParts = ctx.message.text.split(' ');
  if (commandParts.length < 2) {
    return ctx.reply('Usage: /cek <domain>');
  }

  const domain = commandParts[1];

  try {
    const status = checkDomainStatus(domain);
    if (status === 'Blocked') {
      await sendTelegramNotification(`Domain ${domain} ⛔ NAWALA ⛔ Segera ganti!`);
      ctx.reply(`Domain ${domain} ⛔ NAWALA ⛔ Segera ganti.`);
    } else {
      ctx.reply(`Domain ${domain} Masih Aman Bosqu✅.`);
    }
  } catch (error) {
    console.error('Error checking domain status:', error);
    ctx.reply('An error occurred while checking the domain status. Please try again later.');
  }
});

// Tambahkan handler untuk /link
bot.command('link', async (ctx) => {
  const commandParts = ctx.message.text.split(' ');
  if (commandParts.length < 2) {
    return ctx.reply('Usage: /link <domain>');
  }

  const domain = commandParts[1];

  try {
    const status = checkDomainStatus(domain);
    if (status === 'Blocked') {
      await sendTelegramNotification(`Domain ${domain} ⛔ NAWALA ⛔ Segera ganti!`);
      ctx.reply(`Domain ${domain} ⛔ NAWALA ⛔ Segera ganti.`);
    } else {
      ctx.reply(`Domain ${domain} Masih Aman Bosqu✅.`);
    }
  } catch (error) {
    console.error('Error checking domain status:', error);
    ctx.reply('An error occurred while checking the domain status. Please try again later.');
  }
});

bot.launch();

// Endpoint to register a new user
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered');
  } catch (error) {
    res.status(400).send('Error registering user');
  }
});

// Endpoint to login
app.post('/login', async (req, res) => {
  const { username, password, rememberMe } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: rememberMe ? '30d' : '1h' });
    res.json({ token });
  } else {
    res.status(401).send('Invalid username or password');
  }
});

// Middleware to authenticate requests
function authenticate(req, res, next) {
  const token = req.headers['authorization'];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send('Invalid token');
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    res.status(401).send('No token provided');
  }
}

// Endpoint to check single domain
app.post('/check-domain', authenticate, async (req, res) => {
  let { domain } = req.body;
  domain = domain.replace(/\s+/g, '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  console.log('Checking domain:', domain);

  lock.acquire('check-domain', async (done) => {
    try {
      const status = checkDomainStatus(domain);
      console.log('Domain status:', status);

      const user = await User.findById(req.user.id);
      user.singleDomainUrls.push({ domain, status, lastChecked: new Date().toLocaleString() });
      await user.save(); // Simpan ke MongoDB

      if (status === 'Blocked') {
        await sendTelegramNotification(`Domain ${domain} ⛔ NAWALA ⛔ Segera ganti!`);
      }

      res.json({ status });
    } catch (error) {
      console.error('Error checking domain:', error);
      res.status(500).send('Error checking domain');
    } finally {
      done();
    }
  });
});

// Endpoint to check multiple domains
app.post('/bulk-check', authenticate, async (req, res) => {
  const { domains } = req.body;

  lock.acquire('bulk-check', async (done) => {
    try {
      const results = domains.map(domain => {
        const cleanedDomain = domain.replace(/\s+/g, '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
        const status = checkDomainStatus(cleanedDomain);
        return {
          domain: cleanedDomain,
          status: status
        };
      });

      const user = await User.findById(req.user.id);
      results.forEach(async result => {
        user.bulkDomainUrls.push({ domain: result.domain, status: result.status });
        if (result.status === 'Blocked') {
          await sendTelegramNotification(`Domain ${result.domain} ⛔ NAWALA ⛔ Segera ganti!`);
        }
      });
      await user.save();

      res.json(results);
    } catch (error) {
      console.error('Error in bulk check:', error);
      res.status(500).send('Error in bulk check');
    } finally {
      done();
    }
  });
});

// Endpoint to get user's URLs
app.get('/user-urls', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.singleDomainUrls); // Hanya mengembalikan singleDomainUrls untuk index.html
});

// Endpoint to delete a domain
app.delete('/delete-domain', authenticate, async (req, res) => {
  const { domain } = req.body;
  const user = await User.findById(req.user.id);
  user.singleDomainUrls = user.singleDomainUrls.filter(url => url.domain !== domain);
  await user.save();
  res.status(200).send('Domain deleted');
});

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the bulk.html file
app.get('/bulk', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bulk.html'));
});

// Serve the login.html file
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the register.html file
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
