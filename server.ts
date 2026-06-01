import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';

// Fix __dirname in ES Modules context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'database.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure database and uploads run correctly
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial DB template
const defaultDb = {
  users: [],
  chats: [],
  messages: []
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local JSON database, resetting:', err);
    return defaultDb;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to local JSON database:', err);
  }
}

async function startServer() {
  const app = express();

  // Increase body size for Base64 file sharing
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ limit: '60mb', extended: true }));

  // Static directory for uploaded files
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Store active SSE client responses for broadcasting
  let sseClients: express.Response[] = [];

  // Register real-time sync stream (SSE)
  app.get('/api/sync', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write('retry: 3000\n\n');
    sseClients.push(res);

    // Keep connection alive with silent ping
    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients = sseClients.filter(client => client !== res);
    });
  });

  // Broadcast helper
  function broadcast(type: string, payload: any) {
    const data = JSON.stringify({ type, payload, timestamp: Date.now() });
    sseClients.forEach(client => {
      client.write(`data: ${data}\n\n`);
    });
  }

  // API: Get App state or health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // API: List users
  app.get('/api/users', (req, res) => {
    const db = readDb();
    res.json(db.users);
  });

  // API: Delete All Users
  app.delete('/api/users', (req, res) => {
    const db = {
      users: [],
      chats: [],
      messages: []
    };
    writeDb(db);
    broadcast('db_reset', {});
    res.json({ success: true, message: 'All users and conversation histories have been wiped.' });
  });

  // API: Register User
  app.post('/api/users/register', (req, res) => {
    const { username, displayName, publicKey, encryptedPrivateKey, privateKeySalt, avatarUrl, password } = req.body;
    if (!username || !publicKey) {
      res.status(400).json({ error: 'Username and public key are required' });
      return;
    }

    const db = readDb();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    // Check availability
    let user = db.users.find((u: any) => u.username === cleanUsername);
    if (user) {
      // If user exists, verify password (if one has been registered previously)
      if (user.password && password && user.password !== password) {
        res.status(403).json({ error: 'Incorrect password for @' + cleanUsername });
        return;
      }
      // If user exists, verify if keys match (acting as login for simplicity or updating details)
      if (user.publicKey !== publicKey) {
        res.status(403).json({ error: 'Username is already taken by another keypair.' });
        return;
      }
    } else {
      user = {
        id: 'usr_' + Math.random().toString(36).substring(2, 11),
        username: cleanUsername,
        displayName: displayName || username,
        publicKey,
        password, // Store password
        encryptedPrivateKey,
        privateKeySalt,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        createdAt: Date.now(),
        devices: []
      };
      db.users.push(user);
    }

    writeDb(db);
    broadcast('user_registered', user);
    res.json(user);
  });

  // API: Register/Sync device
  app.post('/api/users/:userId/devices', (req, res) => {
    const { userId } = req.params;
    const { deviceId, deviceName } = req.body;

    const db = readDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.devices) user.devices = [];

    const existingDeviceIndex = user.devices.findIndex((d: any) => d.deviceId === deviceId);
    const newDevice = {
      deviceId,
      deviceName: deviceName || 'Web Device',
      lastActive: Date.now()
    };

    if (existingDeviceIndex !== -1) {
      user.devices[existingDeviceIndex] = newDevice;
    } else {
      user.devices.push(newDevice);
    }

    writeDb(db);
    broadcast('device_sync', { userId, devices: user.devices });
    res.json(user);
  });

  // API: Terminate device session
  app.delete('/api/users/:userId/devices/:deviceId', (req, res) => {
    const { userId, deviceId } = req.params;
    const db = readDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.devices = user.devices.filter((d: any) => d.deviceId !== deviceId);
    writeDb(db);
    broadcast('device_terminated', { userId, deviceId, devices: user.devices });
    res.json({ success: true, devices: user.devices });
  });

  // API: Update user settings (e.g., read receipts, displayName, avatarUrl, email, bio, phone)
  app.post('/api/users/:userId/settings', (req, res) => {
    const { userId } = req.params;
    const { disableReadReceipts, displayName, avatarUrl, email, bio, phone } = req.body;

    const db = readDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (disableReadReceipts !== undefined) {
      user.disableReadReceipts = !!disableReadReceipts;
    }
    if (displayName !== undefined && displayName.trim()) {
      user.displayName = displayName.trim();
    }
    if (avatarUrl !== undefined && avatarUrl.trim()) {
      user.avatarUrl = avatarUrl.trim();
    }
    if (email !== undefined) {
      user.email = email.trim();
    }
    if (bio !== undefined) {
      user.bio = bio.trim();
    }
    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    writeDb(db);

    broadcast('user_settings_updated', {
      userId,
      disableReadReceipts: user.disableReadReceipts,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      bio: user.bio,
      phone: user.phone
    });
    res.json(user);
  });

  // API: Get Chats for the user
  app.get('/api/users/:userId/chats', (req, res) => {
    const { userId } = req.params;
    const db = readDb();
    const chats = db.chats.filter((c: any) => c.participants.includes(userId));
    res.json(chats);
  });

  // API: Get all Messages for the user's chats
  app.get('/api/users/:userId/messages', (req, res) => {
    const { userId } = req.params;
    const db = readDb();
    const userChatIds = db.chats
      .filter((c: any) => c.participants.includes(userId))
      .map((c: any) => c.id);
    const messages = db.messages.filter((m: any) => userChatIds.includes(m.chatId));
    res.json(messages);
  });

  // API: Create new Chat
  app.post('/api/chats', (req, res) => {
    const { type, name, participants } = req.body; // participants: array of userIds
    if (type !== 'saved' && (!participants || participants.length < 2)) {
      res.status(400).json({ error: 'At least 2 participants required' });
      return;
    }

    const db = readDb();

    // If saved chat of notes, verify unique to prevent duplicate
    if (type === 'saved') {
      const match = db.chats.find((c: any) => 
        c.type === 'saved' &&
        c.participants.length === 1 &&
        c.participants[0] === participants[0]
      );
      if (match) {
        res.json(match);
        return;
      }
    }

    // If direct chat, verify if it already exists to prevent duplication
    if (type === 'direct') {
      const match = db.chats.find((c: any) => 
        c.type === 'direct' &&
        c.participants.length === 2 &&
        c.participants.includes(participants[0]) &&
        c.participants.includes(participants[1])
      );
      if (match) {
        res.json(match);
        return;
      }
    }

    const chat = {
      id: 'chat_' + Math.random().toString(36).substring(2, 11),
      type: type || 'direct',
      name: name || '',
      participants,
      sharedNotes: '',
      sharedNotesLastModified: Date.now()
    };

    db.chats.push(chat);
    writeDb(db);

    broadcast('chat_created', chat);
    res.json(chat);
  });

  // API: Pin/Unpin a Conversation
  app.post('/api/chats/:chatId/pin', (req, res) => {
    const { chatId } = req.params;
    const { pinned } = req.body;

    const db = readDb();
    const chat = db.chats.find((c: any) => c.id === chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    chat.pinned = !!pinned;
    writeDb(db);

    broadcast('chat_updated', chat);
    res.json(chat);
  });

  // API: Pin/Unpin a specific Message in a Chat
  app.post('/api/chats/:chatId/pin-message', (req, res) => {
    const { chatId } = req.params;
    const { messageId } = req.body;

    const db = readDb();
    const chat = db.chats.find((c: any) => c.id === chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    chat.pinnedMessageId = messageId || null;
    writeDb(db);

    broadcast('chat_updated', chat);
    res.json(chat);
  });

  // API: Delete a specific User (Admin Control)
  app.delete('/api/users/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDb();
    const origLength = db.users.length;
    
    db.users = db.users.filter((u: any) => u.id !== userId);
    if (db.users.length < origLength) {
      writeDb(db);
      broadcast('user_deleted', { userId });
      res.json({ success: true, message: 'User deleted.' });
    } else {
      res.status(404).json({ error: 'User not found.' });
    }
  });

  // API: Delete Chat and associated Messages
  app.delete('/api/chats/:chatId', (req, res) => {
    const { chatId } = req.params;
    const db = readDb();

    const chatIndex = db.chats.findIndex((c: any) => c.id === chatId);
    if (chatIndex === -1) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    db.chats.splice(chatIndex, 1);
    db.messages = db.messages.filter((m: any) => m.chatId !== chatId);

    writeDb(db);

    broadcast('chat_deleted', { chatId });
    res.json({ success: true });
  });

  // API: Broadcast user typing state
  app.post('/api/chats/:chatId/typing', (req, res) => {
    const { chatId } = req.params;
    const { userId, username, displayName, isTyping } = req.body;

    broadcast('typing_event', { chatId, userId, username, displayName, isTyping });
    res.json({ success: true });
  });

  // API: Get chat messages
  app.get('/api/chats/:chatId/messages', (req, res) => {
    const { chatId } = req.params;
    const db = readDb();
    const messages = db.messages.filter((m: any) => m.chatId === chatId);
    res.json(messages);
  });

  // API: Post message (E2EE payload or normal)
  app.post('/api/chats/:chatId/messages', (req, res) => {
    const { chatId } = req.params;
    const { senderId, senderName, content, isEncrypted, type, fileName, fileSize, fileMimeType, fileUrl, selfDestructDuration } = req.body;

    // Fixed the file sharing content validation bug: permit empty content if there is a file shared
    if (!senderId || (content === undefined || content === null)) {
      res.status(400).json({ error: 'Sender, content are required' });
      return;
    }

    const db = readDb();
    const chat = db.chats.find((c: any) => c.id === chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    const message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      chatId,
      senderId,
      senderName,
      content,
      isEncrypted: !!isEncrypted,
      type: type || 'text',
      fileName,
      fileSize,
      fileMimeType,
      fileUrl,
      timestamp: Date.now(),
      selfDestructDuration: selfDestructDuration || 0, // in seconds (0 = never)
      viewedBy: [senderId],
      recalled: false,
      reactions: []
    };

    db.messages.push(message);
    writeDb(db);

    broadcast('message', message);
    res.json(message);
  });

  // API: Mark message as read/viewed (starts self-destruct timers)
  app.post('/api/messages/:messageId/view', (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.body;

    const db = readDb();
    const msg = db.messages.find((m: any) => m.id === messageId);
    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const viewingUser = db.users.find((u: any) => u.id === userId);
    const suppressReceipt = viewingUser && viewingUser.disableReadReceipts;

    let updated = false;

    if (!suppressReceipt) {
      if (!msg.viewedBy.includes(userId)) {
        msg.viewedBy.push(userId);
        updated = true;
      }
    }

    // Still start self-destruct if not already active and recipient read it
    if (msg.selfDestructDuration > 0 && !msg.selfDestructAt && msg.senderId !== userId) {
      msg.selfDestructAt = Date.now() + (msg.selfDestructDuration * 1000);
      updated = true;
    }

    if (updated) {
      writeDb(db);
      
      if (!suppressReceipt) {
        broadcast('message_viewed', { messageId, userId, selfDestructAt: msg.selfDestructAt });
      } else {
        // Suppress reveal of viewer's identity, but still broadcast selfDestructAt timer for coordination
        broadcast('message_viewed_suppressed', { messageId, selfDestructAt: msg.selfDestructAt });
      }
    }

    res.json(msg);
  });

  // API: Recall/Delete message within timeline
  app.post('/api/messages/:messageId/recall', (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.body; // Sender verifying they can recall

    const db = readDb();
    const msg = db.messages.find((m: any) => m.id === messageId);
    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (msg.senderId !== userId) {
      res.status(403).json({ error: 'Unauthorized to recall this message' });
      return;
    }

    msg.recalled = true;
    msg.recalledAt = Date.now();
    msg.content = '[This message was recalled]';
    msg.fileUrl = undefined;
    msg.fileName = undefined;

    writeDb(db);
    broadcast('message_recalled', { messageId, timestamp: msg.recalledAt });
    res.json(msg);
  });

  // Hard Delete Message when self-destruct countdown hits 0 on client or is pushed by server
  app.post('/api/messages/:messageId/destruct', (req, res) => {
    const { messageId } = req.params;
    const db = readDb();
    
    const initialCount = db.messages.length;
    db.messages = db.messages.filter((m: any) => m.id !== messageId);
    
    if (db.messages.length < initialCount) {
      writeDb(db);
      broadcast('message_deleted', { messageId });
    }
    res.json({ success: true });
  });

  // API: Toggle reactions on a message
  app.post('/api/messages/:messageId/reaction', (req, res) => {
    const { messageId } = req.params;
    const { userId, username, emoji } = req.body;

    const db = readDb();
    const msg = db.messages.find((m: any) => m.id === messageId);
    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (!msg.reactions) msg.reactions = [];

    const existingIndex = msg.reactions.findIndex((r: any) => r.userId === userId);
    
    if (existingIndex !== -1) {
      if (msg.reactions[existingIndex].emoji === emoji) {
        // If same reaction clicked again, remove it
        msg.reactions.splice(existingIndex, 1);
      } else {
        // Update reaction
        msg.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // Add reaction
      msg.reactions.push({ userId, username, emoji });
    }

    writeDb(db);
    broadcast('reaction', { messageId, reactions: msg.reactions });
    res.json(msg);
  });

  // API: Edit Shared Notes (Collaborative Pad)
  app.post('/api/chats/:chatId/notes', (req, res) => {
    const { chatId } = req.params;
    const { sharedNotes, userId } = req.body;

    const db = readDb();
    const chat = db.chats.find((c: any) => c.id === chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    chat.sharedNotes = sharedNotes || '';
    chat.sharedNotesLastModified = Date.now();
    chat.sharedNotesModifiedBy = userId;

    writeDb(db);
    broadcast('note_update', { chatId, sharedNotes: chat.sharedNotes, lastModified: chat.sharedNotesLastModified, modifiedBy: userId });
    res.json(chat);
  });

  // API: File Upload directly handling base64 payload
  app.post('/api/upload', (req, res) => {
    const { fileName, fileType, fileDataB64 } = req.body;
    if (!fileName || !fileDataB64) {
      res.status(400).json({ error: 'Filename and base64 file data are required' });
      return;
    }

    try {
      const db = readDb();
      // Clean base64 header if included (e.g. "data:image/png;base64,...")
      const base64Data = fileDataB64.includes(';base64,') 
        ? fileDataB64.split(';base64,')[1] 
        : fileDataB64;

      const buffer = Buffer.from(base64Data, 'base64');
      const uniqueName = `${Date.now()}__${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(filePath, buffer);
      
      const fileUrl = `/uploads/${uniqueName}`;
      res.json({
        success: true,
        fileUrl,
        fileName,
        fileSize: buffer.length,
        fileType
      });
    } catch (err) {
      console.error('File write failed:', err);
      res.status(500).json({ error: 'Failed to write file to local database storage' });
    }
  });

  // API: Initiate Voice/Video Call Event Sync
  app.post('/api/calls', (req, res) => {
    const { chatId, callerId, callerName, receiverId, type, status, roomId } = req.body;
    if (!chatId || !callerId || !receiverId) {
      res.status(400).json({ error: 'Missing mandatory call event details' });
      return;
    }

    const callEvent = {
      roomId: roomId || 'room_' + Math.random().toString(36).substring(2, 11),
      chatId,
      callerId,
      callerName,
      receiverId,
      type: type || 'video',
      status: status || 'outgoing',
      timestamp: Date.now()
    };

    // Broadcast call events in real-time so other device responds
    broadcast('call_event', callEvent);
    res.json(callEvent);
  });

  // Server-side periodic cleanup task
  // Scans and purges expired self-destructing files from /uploads directory to save disk space
  // Also purges expired messages if any client crashed/disconnected and didn't trigger deletion
  setInterval(() => {
    try {
      const db = readDb();
      const now = Date.now();
      let dbChanged = false;

      // 1. Purge expired self-destructing messages from DB and broadcast to active screens
      db.messages = db.messages.filter((msg: any) => {
        if (msg.selfDestructAt && msg.selfDestructAt <= now) {
          dbChanged = true;
          // Purge from client views
          broadcast('message_deleted', { messageId: msg.id });
          return false;
        }
        return true;
      });

      if (dbChanged) {
        writeDb(db);
      }

      // 2. Scan and purge unreferenced or expired/recalled attachment files from /uploads
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        
        // Collate all active referenced fileUrls
        const referencedUrls = new Set<string>();
        db.messages.forEach((msg: any) => {
          if (msg.fileUrl) {
            referencedUrls.add(msg.fileUrl);
          }
        });

        files.forEach((file) => {
          const filePath = path.join(UPLOADS_DIR, file);
          const fileUrlPath = `/uploads/${file}`;

          if (!referencedUrls.has(fileUrlPath)) {
            try {
              const stats = fs.statSync(filePath);
              // Provide a 5-minute grace period to prevent purging files during current uploads
              const isExpired = (now - stats.mtimeMs) > 5 * 60 * 1000;
              if (isExpired) {
                fs.unlinkSync(filePath);
                console.log(`[CLEANUP] Purged expired or unreferenced file: ${file}`);
              }
            } catch (err) {
              console.error(`[CLEANUP] Failed to read/delete file: ${file}`, err);
            }
          }
        });
      }
    } catch (err) {
      console.error('[CLEANUP SYSTEM ERROR]', err);
    }
  }, 15000); // Trigger cleanup sweep every 15 seconds

  // Setup Vite Dev server or Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite loaded in Middleware mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 on host 0.0.0.0
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`Deep Talk Server is active!`);
    console.log(`Local Access URL: http://localhost:${PORT}`);
    console.log(`Running on: 0.0.0.0:${PORT}`);
    console.log(`===============================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start full stack Express application:', err);
});
