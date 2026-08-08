const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');

const getUserNotifications = async (userId, queryParams) => {
  const { page = 1, limit = 20, unreadOnly = false, type } = queryParams;

  const filter = { user: userId };
  if (unreadOnly === 'true' || unreadOnly === true) {
    filter.isRead = false;
  }
  if (type) {
    filter.type = type;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, isRead: false })
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      targetType: n.targetType,
      targetId: n.targetId,
      targetUrl: n.targetUrl,
      isRead: n.isRead,
      createdAt: n.createdAt
    })),
    unreadCount,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ user: userId, isRead: false });
  return { unreadCount: count };
};

const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  return {
    id: notification._id,
    isRead: notification.isRead
  };
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );

  return { modifiedCount: result.modifiedCount };
};

const deleteNotification = async (userId, notificationId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  return true;
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};