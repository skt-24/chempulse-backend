const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Notification;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5008';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_notifications_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_notifications_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  User = require('../../src/models/User');
  Notification = require('../../src/models/Notification');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Notifications REST API', () => {
  it('GET /api/notifications - should return paginated user notifications and unread count', async () => {
    const user = await User.create({ name: 'Scientist', email: 'scientist@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    await Notification.create({
      user: user._id,
      type: 'research',
      title: 'New Article Published',
      message: 'A new breakthrough in quantum computing was published.',
      isRead: false
    });

    await Notification.create({
      user: user._id,
      type: 'molecule',
      title: 'Molecule of the Day',
      message: 'Check out today\'s molecule: Hydrogen.',
      isRead: true
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications.length).toBe(2);
    expect(res.body.data.unreadCount).toBe(1);
  });

  it('GET /api/notifications/unread-count - should return unread count only', async () => {
    const user = await User.create({ name: 'User Unread', email: 'unread@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    await Notification.create({
      user: user._id,
      type: 'quiz',
      title: 'Daily Quiz Ready',
      message: 'Test your chemistry knowledge today!',
      isRead: false
    });

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(1);
  });

  it('PATCH /api/notifications/:id/read - should mark a single notification as read', async () => {
    const user = await User.create({ name: 'User Single', email: 'single@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const notif = await Notification.create({
      user: user._id,
      type: 'system',
      title: 'System Update',
      message: 'ChemPulse platform update completed.',
      isRead: false
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  it('PATCH /api/notifications/read-all - should mark all user notifications as read', async () => {
    const user = await User.create({ name: 'User All', email: 'all@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    await Notification.create({ user: user._id, type: 'category', title: 'Cat 1', message: 'Msg 1', isRead: false });
    await Notification.create({ user: user._id, type: 'category', title: 'Cat 2', message: 'Msg 2', isRead: false });

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.modifiedCount).toBe(2);
  });

  it('DELETE /api/notifications/:id - should delete notification with ownership protection', async () => {
    const user1 = await User.create({ name: 'Owner', email: 'owner@chempulse.io', passwordHash: 'Password123!' });
    const user2 = await User.create({ name: 'Stranger', email: 'stranger@chempulse.io', passwordHash: 'Password123!' });

    const token2 = require('../../src/utils/tokens').generateAccessToken(user2._id);

    const notif = await Notification.create({
      user: user1._id,
      type: 'research',
      title: 'Private Alert',
      message: 'Owner message',
      isRead: false
    });

    // Stranger attempts to delete Owner's notification
    const res = await request(app)
      .delete(`/api/notifications/${notif._id}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
  });
});