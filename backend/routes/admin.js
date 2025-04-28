const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middlewares/auth');
const User = require('../models/User');
const Post = require('../models/Post');

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Update user credits
router.put('/users/:userId/credits', adminAuth, async (req, res) => {
  try {
    const { credits } = req.body;
    if (typeof credits !== 'number') {
      return res.status(400).json({ message: 'Credits must be a number' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.credits = credits;
    await user.save();

    res.json({ message: 'Credits updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating credits', error: error.message });
  }
});

// Get reported posts
router.get('/reported-posts', adminAuth, async (req, res) => {
  try {
    const posts = await Post.find({ 'reportedBy.0': { $exists: true } })
      .populate('reportedBy.user', 'username')
      .sort({ 'reportedBy.timestamp': -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reported posts', error: error.message });
  }
});

// Get platform analytics
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalReports,
      userCreditsDistribution,
      postSourceDistribution
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Post.countDocuments({ 'reportedBy.0': { $exists: true } }),
      User.aggregate([
        {
          $group: {
            _id: null,
            avgCredits: { $avg: '$credits' },
            maxCredits: { $max: '$credits' },
            minCredits: { $min: '$credits' }
          }
        }
      ]),
      Post.aggregate([
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      totalUsers,
      totalPosts,
      totalReports,
      userCreditsDistribution: userCreditsDistribution[0],
      postSourceDistribution
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

// Delete reported post
router.delete('/posts/:postId', adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await post.remove();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error: error.message });
  }
});

module.exports = router; 